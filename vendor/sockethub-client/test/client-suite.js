if(typeof(define) !== 'function') {
  var define = require('amdefine')(module);
}
define(['requirejs'], function(requirejs) {

  return [
    {
      name: "SockethubClient",
      desc: "Provides a boilerplate for writing sockethub clients",
      setup: function(env, test) {
        requirejs([
          './src/sockethub/client'
        ], function(SockethubClient) {
          env.SockethubClient = SockethubClient;
          test.done();
        });
      },

      beforeEach: function(env, test) {
        env.fakeJsonClient = {
          send: function(object) {
            this._sentObjects.push(object);
          },
          disconnect: function() {
            this.disconnectCalled = true;
          },
          on: function(eventName, handler) {
            this._eventHandlers[eventName].push(handler);
          },
          _eventHandlers: { message: [], connected: [], disconnected: [], failed: [], reconnected: [], reconnecting: [] },
          _sentObjects: []
        };
        env.client = new env.SockethubClient(env.fakeJsonClient);
        test.done();
      },

      tests: [

        {
          desc: "it installs a 'message' handler on the JSON client",
          run: function(env, test) {
            test.assert(env.fakeJsonClient._eventHandlers.message.length, 1);
          }
        },

        {
          desc: "#sendObject attaches a 'rid'",
          run: function(env, test) {
            env.client.sendObject({
              send: "the f***ing message"
            });
            test.assert(env.fakeJsonClient._sentObjects, [
              {
                send: "the f***ing message",
                rid: 1
              }
            ]);
          }
        },

        {
          desc: "#sendObject increments the 'rid' with each call",
          run: function(env, test) {
            env.client.sendObject({});
            env.client.sendObject({});
            env.client.sendObject({});
            var sent = env.fakeJsonClient._sentObjects;
            test.assertAnd(sent[0].rid, 1);
            test.assertAnd(sent[1].rid, 2);
            test.assertAnd(sent[2].rid, 3);
            test.done();
          }
        },

        {
          desc: "#sendObject returns a promise",
          run: function(env, test) {
            var result = env.client.sendObject({});
            test.assertTypeAnd(result, 'object');
            test.assertType(result.then, 'function');
          }
        },

        {
          desc: "#sendObject's promise is fulfilled, when a response is received",
          timeout: 500,
          run: function(env, test) {
            env.client.sendObject({}).
              then(function(response) {
                test.assert(response.info, "this is the response");
              });
            var sent = env.fakeJsonClient._sentObjects;
            var rid = sent[0].rid;
            var messageEventHandler = env.fakeJsonClient._eventHandlers.message[0];
            messageEventHandler({
              info: "this is the response",
              rid: rid
            });
          }
        },

        {
          desc: "#sendObject's promise is rejected, when the response is a confirmation with status=false",
          timeout: 500,
          run: function(env, test) {
            env.client.sendObject({}).
              then(function() {
                test.result(false, "expected promise to be rejected");
              }, function(error) {
                test.assert(error.message, "something went wrong!");
              });
            var rid = env.fakeJsonClient._sentObjects[0].rid
            var messageEventHandler = env.fakeJsonClient._eventHandlers.message[0];
            messageEventHandler({
              message: "something went wrong!",
              verb: "confirm",
              status: false,
              rid: rid
            });
          }
        },

        {
          desc: "#sendObject's promise is also rejected, when the response has status=false",
          run: function(env, test) {
            env.client.sendObject({}).
              then(function() {
                test.result(false);
              }, function(error) {
                test.assert(error.message, 'err-msg');
              });
            var rid = env.fakeJsonClient._sentObjects[0].rid;
            var messageEventHandler = env.fakeJsonClient._eventHandlers.message[0];
            messageEventHandler({
              message: 'err-msg',
              rid: rid,
              status: false
            });
          }
        },

        {
          desc: "#declareVerb declares a new verb method",
          run: function(env, test) {
            env.client.declareVerb('travel', [], {});
            test.assertType(env.client.travel, 'function');
          }
        },

        {
          desc: "#declareVerb accepts an optional decorator for the verb method",
          timeout: 500,
          run: function(env, test) {
            env.client.declareVerb('travel', [], {}, function(method) {
              test.assertTypeAnd(method, 'function');
              return function() {
                test.done();
                // actual verb method never called.
              };
            });
            env.client.travel();
          }
        },

        {
          desc: "verb methods return a promise",
          run: function(env, test) {
            env.client.declareVerb('travel', [], {});

            var result = env.client.travel();

            test.assertTypeAnd(result, 'object');
            test.assertTypeAnd(result.then, 'function');
            test.done();
          }
        },

        {
          desc: "verb methods send an object with the right verb",
          run: function(env, test) {
            env.client.declareVerb('travel', [], {});

            env.client.travel();

            test.assertAnd(env.fakeJsonClient._sentObjects.length, 1);
            test.assertAnd(env.fakeJsonClient._sentObjects[0].verb, 'travel');
            test.done();
          }
        },

        {
          desc: "verb methods attach positional arguments as attributes to the method",
          run: function(env, test) {
            env.client.declareVerb('travel', ['origin', 'destination'], {});

            env.client.travel('Hamburg', 'Berlin');

            var sentObject = env.fakeJsonClient._sentObjects.shift();
            test.assertAnd(sentObject.origin, 'Hamburg');
            test.assertAnd(sentObject.destination, 'Berlin');
            test.done();
          }
        },

        {
          desc: "verb methods apply the provided template to the sent message",
          run: function(env, test) {
            env.client.declareVerb('travel', [], {
              origin: {},
              destination: {}
            });

            env.client.travel();

            var sentObject = env.fakeJsonClient._sentObjects.shift();
            test.assertAnd(sentObject.origin, {});
            test.assertAnd(sentObject.destination, {});
            test.done();
          }
        },

        {
          desc: "verb methods' positional parameters can modify nested structures from the template",
          run: function(env, test) {
            env.client.declareVerb('travel', ['origin.city', 'destination.city'], {
              origin: {},
              destination: {}
            });

            env.client.travel('Hamburg', 'Berlin');

            var sentObject = env.fakeJsonClient._sentObjects.shift();
            test.assertAnd(sentObject.origin.city, 'Hamburg');
            test.assertAnd(sentObject.destination.city, 'Berlin');
            test.done();
          }
        },

        {
          desc: "verb methods' final parameter is used to extend the message, if it is present and an object",
          run: function(env, test) {
            env.client.declareVerb('travel', ['origin', 'destination'], {});

            env.client.travel('Hamburg', 'Berlin', {
              modeOfTransport: 'train'
            });

            var sentObject = env.fakeJsonClient._sentObjects.shift();
            test.assert(sentObject.modeOfTransport, 'train');
          }
        },

        {
          desc: "the client forwards 'connected' events from the JSONClient",
          timeout: 500,
          run: function(env, test) {
            env.client.on('connected', function() {
              test.done();
            });
            test.assertAnd(env.fakeJsonClient._eventHandlers.connected.length, 1);
            env.fakeJsonClient._eventHandlers.connected[0]();
          }
        },

        {
          desc: "the client forwards 'disconnected' events from the JSONClient",
          timeout: 500,
          run: function(env, test) {
            env.client.on('disconnected', function() {
              test.done();
            });
            test.assertAnd(env.fakeJsonClient._eventHandlers.disconnected.length, 1);
            env.fakeJsonClient._eventHandlers.disconnected[0]();
          }
        },

        {
          desc: "the client forwards 'failed' events from the JSONClient",
          timeout: 500,
          run: function(env, test) {
            env.client.on('failed', function() {
              test.done();
            });
            test.assertAnd(env.fakeJsonClient._eventHandlers.failed.length, 1);
            env.fakeJsonClient._eventHandlers.failed[0]();
          }
        },

        {
          desc: "#declareEvent adds a custom event",
          timeout: 500,
          run: function(env, test) {
            env.client.declareEvent('something-happened');
            env.client.on('something-happened', function() {
              test.done();
            });
            env.client._emit('something-happened');
          }
        },

        {
          desc: "#disconnect is delegated to the JSONClient",
          run: function(env, test) {
            env.client.disconnect();
            test.assert(env.fakeJsonClient.disconnectCalled, true);
          }
        },

        {
          desc: "messages received without a 'rid' cause 'message' events",
          timeout: 500,
          run: function(env, test) {
            env.client.on('message', function(message) {
              test.assert(message, { ber: 'lin' });
            });
            env.fakeJsonClient._eventHandlers.message[0]({ ber: 'lin' });
          }
        },

        {
          desc: "messages with a unknown 'rid' cause 'unexpected-response' events",
          timeout: 500,
          run: function(env, test) {
            env.client.on('unexpected-response', function(message) {
              test.assert(message.rid, 12345);
            });
            env.fakeJsonClient._eventHandlers.message[0]({ rid: 12345 });
          }
        },

        {
          desc: "the client's 'connected' state is the same as the jsonClient's",
          run: function(env, test) {
            env.client.jsonClient.connected = true;
            test.assertAnd(env.client.connected, true);
            env.client.jsonClient.connected = false;
            test.assertAnd(env.client.connected, false);
            test.done();
          }
        }

      ]
    }
  ];

});
