IrcMe
===

IrcMe is a node.js IRC bot building library with a flexible plugin system.

Installation
----

Either clone the repository into your project or use [npm](http://npmjs.org/) to install:

	npm install irc_me
	
From there, let's get our bot running:

	var IrcMe = require("irc_me");
	options = {
		host: "your.irc.com",
		port: "6667"
	};
	var bot = new IrcMe(options);
	bot.connect();
	
Options
----

Options available to pass to IrcMe:

* host
* port
* nickname
* user
* realname

Plugins!
----

Connecting to a network isn't all that useful if it doesn't respond to anything.  This
is where the plugin system comes in.  The addPlugin method takes a class with two methods:

* [bool] listener(message) - This method checks the message to determine if the callback should be run
* callback(message) - This is the callback executed when listener returns true

For example:
	Botsnack = {
		listen: function(message) {
			if(message.message.match(/^@botsnack/)) {
				return true;
			} else {
				return false;
			}
		},
		callback: function(message) {
			this.say(message.target, "Thank You! :)")
		}
	}

IrcMe does not care how the listener determines if it triggers, it just needs to return true/false.
To register your plugin, call the addPlugin method:

	bot.addPlugin(Botsnack);

