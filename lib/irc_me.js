(function() {
	var sys = require('sys');
	var net = require('net');
	var util = require("util");
	var IrcMe;

	exports.IrcMe = IrcMe = (function() {
		function IrcMe(config) {
			this.host = config.host || "127.0.0.1";
			this.port = config.port || 6667;
			this.nick = config.nick || "IrcMe";
			this.user = config.user || "IrcMe";
			this.realname = config.realname || "IrcMe";

			this.buffer = "";
			this.connection = null;
			this.encoding = "utf8";
			this.timeout = 600;
			this.debug = false;
		}
		
		util.inherits(IrcMe, process.EventEmitter);
		
		IrcMe.prototype.connect = function() {
			if(this.debug) {
				sys.puts("Connecting to " + this.host + " on port " + this.port);
			}
			var c = this.connection = net.createConnection(this.port, this.host);
			this.connection.setEncoding(this.encoding);
			this.connection.setTimeout(this.timeout);
			this.connection.setKeepAlive(enable=true, 10000);
			var that = this;
			function addL(ev, f){
				return c.addListener(ev, (function(){
					return function(){f.apply(that,arguments)};
				})() );
			}

			addL("connect", this.connectionEstablished);
			addL("data", this.dataReceived);
			addL("close", this.onClose);
			addL("eof", this.onEOF);
			addL("timeout", this.onTimeout);
		}

		IrcMe.prototype.connectionEstablished = function() {
			this.raw("NICK " + this.nick);
			this.raw("USER " + this.user + " 0 * :" + this.realname);

			this.emit("connect");
		}

		IrcMe.prototype.dataReceived = function(chunk) {
			this.buffer += chunk;
			while(this.buffer) {
				offset = this.buffer.indexOf("\r\n");
				if (offset < 0) {
					return;
				}
				msg = this.buffer.substr(0,offset);
				this.buffer = this.buffer.substr(offset + 2);
				if(this.debug) {
					sys.puts("< " + msg);
				}
				this.messageHandler(this.parseMessage(msg));
			}
		}

		IrcMe.prototype.parseMessage = function(msg) {
			match = msg.match(/(^:(\S+) )?(\S+) ?(.*)/);

			parsed = {
				server: match[2],
				command: match[3],
			};

			params_split = match[4].split(":",2);
			if(params_split[0] != "") {
				parsed.params = params_split[0].split(" ");
				parsed.params = parsed.params.splice(0,parsed.params.length - 1);
			} else {
				parsed.params = [];
			}

			parsed.params = parsed.params.concat([params_split[1]]);
			if(this.debug) {
				sys.puts("server: " + parsed.server + " command: "+ parsed.command + " params: [" + parsed.params.join(",") + "]")
			}
			return parsed;
		}

		IrcMe.prototype.messageHandler = function(message) {
			switch(message.command) {
				case 'PING':
					this.raw("PONG :" + message.params[0]);
					break;
				case '422':
				case '376':
					this.emit("startup");
					break;
				case 'PRIVMSG':
					details = {
						from: message.server.split("!")[0],
						target: message.params[0],
						message: message.params[1]
					}
					this.emit("message", details);
					break;
				case 'ERROR':
					this.disconnect(message.params[0]);
					break;
			}
		}
		
		IrcMe.prototype.onStartup = function(callback) {
			this.on("startup", function() {
				callback.apply(this);
			});
		}
		
		IrcMe.prototype.addPlugin = function(plugin) {
			this.on("message", function(message) {
				if(plugin.listener) {
					plugin.callback.apply(this, [message]);
				}
			});
		}

		IrcMe.prototype.raw = function(message) {
			this.connection.write(message + "\r\n");
			if (this.debug) {
				sys.puts("< " + message);
			}
		}
		
		IrcMe.prototype.say = function(channel, message) {
			this.raw("PRIVMSG " + channel + " :" + message);
		}

		IrcMe.prototype.emitInfo=function(info) {
			this.emit("INFO",info);
		}

		IrcMe.prototype.onClose = function() {
			this.disconnect('close');
		}

		IrcMe.prototype.disconnect = function(reason) {
			this.emitInfo("Connection Terminated: " + reason);
			this.emit("end");
		}

		IrcMe.prototype.onEOF = function() {
			this.disconnect('EOF');
		}

		IrcMe.prototype.onTimeout = function() {
			this.disconnect('timeout');
		}
		
		return IrcMe;
	})();
}).call(this);