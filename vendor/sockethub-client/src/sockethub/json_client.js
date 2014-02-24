/**
 * This file is part of sockethub-client.
 *
 * © 2013 Niklas E. Cathor (https://github.com/nilclass)
 * © 2013 Nick Jennings (https://github.com/silverbucket)
 *
 * sockethub-client is dual-licensed under either the MIT License or GPLv3 (at your choice).
 * See the files LICENSE-MIT and LICENSE-GPL for details.
 *
 * The latest version of sockethub-client can be found here:
 *   git://github.com/sockethub/sockethub-client.git
 *
 * For more information about sockethub visit http://sockethub.org/.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *
 */

define(['./event_handling'], function (eventHandling) {

  /**
   * Class: JSONClient
   *
   * Exchanges JSON messages via a WebSocket
   *
   * Parameters:
   *   socket - a WebSocket object
   *
   */
  var JSONClient = function (uri, protocol, reconnect) {

    this.uri = uri;
    this.protocol = protocol;
    this.reconnect = reconnect || false;

    eventHandling(
      this,

      /**
       * Event: message
       *
       * Emitted when a new JSON message is received.
       *
       * Parameters:
       *   object - the unpacked JSON object
       *
       */
      'message',

      /**
       * Event: connected
       *
       * Emitted when the websocket is opened.
       */
      'connected',

      /**
       * Event: reconnecting
       *
       * Emitted when the websocket is closed but reconnecting.
       */
      'reconnecting',

      /**
       * Event: reconnected
       *
       * Emitted when the websocket is opened after a reconnect (old handlers
       * still active).
       *
       */
      'reconnected',

      /**
       * Event: disconnected
       *
       * Emitted when the websocket is closed.
       */
      'disconnected',

      /**
       * Event: disconnected
       *
       * Emitted when the websocket connection failed.
       */
      'failed'
    );

    this.wsConnect();
  };

  JSONClient.prototype = {

    wsConnect: function () {
      this.socket = null;
      delete this.socket;
      var ws = new WebSocket(this.uri, this.protocol);
      this.socket = ws;
      // start listening.
      this._listen();
    },

    /**
     * Method: send
     *
     * Serialize given object and send it.
     */
    send: function (object) {
      this.socket.send(JSON.stringify(object));
    },

    /**
     * Method: disconnect
     *
     * Close the socket.
     */
    disconnect: function () {
      this.socket.close();
    },

    // Start listening on socket
    _listen: function () {
      this.socket.onmessage = this._processMessageEvent.bind(this);
      this.connected = false;
      var _this = this;

      this.socket.onopen = function () {
        this.connected = true;
        if (this.reconnecting) {
          this._emit('reconnected');
          this.reconnecting = false;
        } else {
          this._emit('connected');
        }
      }.bind(this);

      this.socket.onclose = function () {
        if ((this.connected) &&
            (!this.reconnect)) {
          console.log('sockethub-client disconnected, not reconnecting...');
          this._emit('disconnected');
          this.connected = false;
        } else if ((this.connected) &&
                   (this.reconnect)) {
          this._emit('reconnecting');
          this.connected = false;
          this.reconnecting = true;
          console.log('sockethub-client disconnected, attempting reconnect...');
          this.wsConnect();
        } else if ((this.reconnecting) &&
                   (!this.connected)) {
          // failed reconnecting...
          setTimeout(function () {
            console.log('sockethub-client attempting reconnect after 5s');
            _this.wsConnect();
          }, 5000);
        } else {
          this._emit('failed');
        }
      }.bind(this);
    },

    // Emit "message" event
    _processMessageEvent: function (event) {
      this._emit('message', JSON.parse(event.data));
    }

  };

  return JSONClient;

});
