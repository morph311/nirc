angular.module('nirc')
  .factory('Client', function($rootScope, Channel, User, ChatEvent) {
    var socket = io.connect(null);

    var Client = {
      /* these are the connection params we'll use when connect() is called. */
      options: {
        server:   'irc.freenode.org',
        port:     6667,
        nick:     'nircUser',
        username: 'Nirc User',
        channels: [],
        ssl:      false,
        password: null
      },

      connected: false, /* are we currently connected? */
      channels: [],     /* list of channels we're in. */
      statusChannel: new Channel('status'), /* psuedo-channel for displaying
                                             * content that doesn't belong in a
                                             * regular channel */
      activeChannel: null, /* the currently selected channel */
      me: new User(''),    /* our user information. */

      /* -- public interface below -- */

      say: function(text) {
        var ch = this.activeChannel;

        if (!text || !text.length) {
          return;
        }

        if (text.charAt(0) != '/') {
          /* add our own text to the channel. */
          ch.addEvent(new ChatEvent(this.me, new User(ch.name), text));
          text = ['/msg', ch.name, text].join(' ');
        }

        socket.emit('command', text);
      },

      connect: function() {
        socket.emit('connect', { options: this.options });
        this.connected = true;
      },

      disconnect: function() {
        this.connected = false;
        this.channels = [];
        this.activeChannel = this.statusChannel;
      },

      /* set the active channel to the provided channel object. */
      setActive: function(channel) {
        this.activeChannel = channel;
        this.activeChannel.activity = false;
      },

      /* find a channel, given a name. returns undefined if not found. */
      channel: function(name) {
        if (name == 'status') {
          return this.statusChannel;
        }
        return _.find(this.channels, function(ch) { return ch.name == name; });
      }
    };

    /* initially our active channel is the status pane. */
    Client.activeChannel = Client.statusChannel;

    /* event handlers */
    var handlers = {

    };

    var onUnknown = function(msg) {
      Client.statusChannel.addEvent(
        new ChatEvent(
          msg.from,
          null,
          msg.args.join(' '),
          { type: msg.command }
        )
      );
    };

    socket.on('message', function(msg) {
      var cmd = msg.command.toLowerCase(),
          handler;

      if (!(handler = handlers[cmd])) {
        handler = onUnknown;
      }
      $rootScope.$apply(function() { handler(msg); });
    });

    return Client;
  });
