(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

EventEmitter.prototype.listeners = function listeners(type) {
  var evlistener;
  var ret;
  var events = this._events;

  if (!events)
    ret = [];
  else {
    evlistener = events[type];
    if (!evlistener)
      ret = [];
    else if (typeof evlistener === 'function')
      ret = [evlistener.listener || evlistener];
    else
      ret = unwrapListeners(evlistener);
  }

  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){
/* jshint node: true */
'use strict';

var normalice = require('normalice');

/**
  # freeice

  The `freeice` module is a simple way of getting random STUN or TURN server
  for your WebRTC application.  The list of servers (just STUN at this stage)
  were sourced from this [gist](https://gist.github.com/zziuni/3741933).

  ## Example Use

  The following demonstrates how you can use `freeice` with
  [rtc-quickconnect](https://github.com/rtc-io/rtc-quickconnect):

  <<< examples/quickconnect.js

  As the `freeice` module generates ice servers in a list compliant with the
  WebRTC spec you will be able to use it with raw `RTCPeerConnection`
  constructors and other WebRTC libraries.

  ## Hey, don't use my STUN/TURN server!

  If for some reason your free STUN or TURN server ends up in the
  list of servers ([stun](https://github.com/DamonOehlman/freeice/blob/master/stun.json) or
  [turn](https://github.com/DamonOehlman/freeice/blob/master/turn.json))
  that is used in this module, you can feel
  free to open an issue on this repository and those servers will be removed
  within 24 hours (or sooner).  This is the quickest and probably the most
  polite way to have something removed (and provides us some visibility
  if someone opens a pull request requesting that a server is added).

  ## Please add my server!

  If you have a server that you wish to add to the list, that's awesome! I'm
  sure I speak on behalf of a whole pile of WebRTC developers who say thanks.
  To get it into the list, feel free to either open a pull request or if you
  find that process a bit daunting then just create an issue requesting
  the addition of the server (make sure you provide all the details, and if
  you have a Terms of Service then including that in the PR/issue would be
  awesome).

  ## I know of a free server, can I add it?

  Sure, if you do your homework and make sure it is ok to use (I'm currently
  in the process of reviewing the terms of those STUN servers included from
  the original list).  If it's ok to go, then please see the previous entry
  for how to add it.

  ## Current List of Servers

  * current as at the time of last `README.md` file generation

  ### STUN

  <<< stun.json

  ### TURN

  <<< turn.json

**/

var freeice = module.exports = function(opts) {
  // if a list of servers has been provided, then use it instead of defaults
  var servers = {
    stun: (opts || {}).stun || require('./stun.json'),
    turn: (opts || {}).turn || require('./turn.json')
  };

  var stunCount = (opts || {}).stunCount || 2;
  var turnCount = (opts || {}).turnCount || 0;
  var selected;

  function getServers(type, count) {
    var out = [];
    var input = [].concat(servers[type]);
    var idx;

    while (input.length && out.length < count) {
      idx = (Math.random() * input.length) | 0;
      out = out.concat(input.splice(idx, 1));
    }

    return out.map(function(url) {
        //If it's a not a string, don't try to "normalice" it otherwise using type:url will screw it up
        if ((typeof url !== 'string') && (! (url instanceof String))) {
            return url;
        } else {
            return normalice(type + ':' + url);
        }
    });
  }

  // add stun servers
  selected = [].concat(getServers('stun', stunCount));

  if (turnCount) {
    selected = selected.concat(getServers('turn', turnCount));
  }

  return selected;
};

},{"./stun.json":3,"./turn.json":4,"normalice":8}],3:[function(require,module,exports){
module.exports=[
  "stun.l.google.com:19302",
  "stun1.l.google.com:19302",
  "stun2.l.google.com:19302",
  "stun3.l.google.com:19302",
  "stun4.l.google.com:19302",
  "stun.ekiga.net",
  "stun.ideasip.com",
  "stun.schlund.de",
  "stun.stunprotocol.org:3478",
  "stun.voiparound.com",
  "stun.voipbuster.com",
  "stun.voipstunt.com",
  "stun.voxgratia.org",
  "stun.services.mozilla.com"
]

},{}],4:[function(require,module,exports){
module.exports=[]

},{}],5:[function(require,module,exports){
var WildEmitter = require('wildemitter');

function getMaxVolume (analyser, fftBins) {
  var maxVolume = -Infinity;
  analyser.getFloatFrequencyData(fftBins);

  for(var i=4, ii=fftBins.length; i < ii; i++) {
    if (fftBins[i] > maxVolume && fftBins[i] < 0) {
      maxVolume = fftBins[i];
    }
  };

  return maxVolume;
}


var audioContextType;
if (typeof window !== 'undefined') {
  audioContextType = window.AudioContext || window.webkitAudioContext;
}
// use a single audio context due to hardware limits
var audioContext = null;
module.exports = function(stream, options) {
  var harker = new WildEmitter();


  // make it not break in non-supported browsers
  if (!audioContextType) return harker;

  //Config
  var options = options || {},
      smoothing = (options.smoothing || 0.1),
      interval = (options.interval || 50),
      threshold = options.threshold,
      play = options.play,
      history = options.history || 10,
      running = true;

  //Setup Audio Context
  if (!audioContext) {
    audioContext = new audioContextType();
  }
  var sourceNode, fftBins, analyser;

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = smoothing;
  fftBins = new Float32Array(analyser.frequencyBinCount);

  if (stream.jquery) stream = stream[0];
  if (stream instanceof HTMLAudioElement || stream instanceof HTMLVideoElement) {
    //Audio Tag
    sourceNode = audioContext.createMediaElementSource(stream);
    if (typeof play === 'undefined') play = true;
    threshold = threshold || -50;
  } else {
    //WebRTC Stream
    sourceNode = audioContext.createMediaStreamSource(stream);
    threshold = threshold || -50;
  }

  sourceNode.connect(analyser);
  if (play) analyser.connect(audioContext.destination);

  harker.speaking = false;

  harker.suspend = function() {
    audioContext.suspend();
  }
  harker.resume = function() {
    audioContext.resume();
  }
  Object.defineProperty(harker, 'state', { get: function() {
    return audioContext.state;
  }});
  audioContext.onstatechange = function() {
    harker.emit('state_change', audioContext.state);
  }

  harker.setThreshold = function(t) {
    threshold = t;
  };

  harker.setInterval = function(i) {
    interval = i;
  };

  harker.stop = function() {
    running = false;
    harker.emit('volume_change', -100, threshold);
    if (harker.speaking) {
      harker.speaking = false;
      harker.emit('stopped_speaking');
    }
    analyser.disconnect();
    sourceNode.disconnect();
  };
  harker.speakingHistory = [];
  for (var i = 0; i < history; i++) {
      harker.speakingHistory.push(0);
  }

  // Poll the analyser node to determine if speaking
  // and emit events if changed
  var looper = function() {
    setTimeout(function() {

      //check if stop has been called
      if(!running) {
        return;
      }

      var currentVolume = getMaxVolume(analyser, fftBins);

      harker.emit('volume_change', currentVolume, threshold);

      var history = 0;
      if (currentVolume > threshold && !harker.speaking) {
        // trigger quickly, short history
        for (var i = harker.speakingHistory.length - 3; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history >= 2) {
          harker.speaking = true;
          harker.emit('speaking');
        }
      } else if (currentVolume < threshold && harker.speaking) {
        for (var i = 0; i < harker.speakingHistory.length; i++) {
          history += harker.speakingHistory[i];
        }
        if (history == 0) {
          harker.speaking = false;
          harker.emit('stopped_speaking');
        }
      }
      harker.speakingHistory.shift();
      harker.speakingHistory.push(0 + (currentVolume > threshold));

      looper();
    }, interval);
  };
  looper();


  return harker;
}

},{"wildemitter":24}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
/*!
 * @name JavaScript/NodeJS Merge v1.2.0
 * @author yeikos
 * @repository https://github.com/yeikos/js.merge

 * Copyright 2014 yeikos - MIT license
 * https://raw.github.com/yeikos/js.merge/master/LICENSE
 */

;(function(isNode) {

	/**
	 * Merge one or more objects 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	var Public = function(clone) {

		return merge(clone === true, false, arguments);

	}, publicName = 'merge';

	/**
	 * Merge two or more objects recursively 
	 * @param bool? clone
	 * @param mixed,... arguments
	 * @return object
	 */

	Public.recursive = function(clone) {

		return merge(clone === true, true, arguments);

	};

	/**
	 * Clone the input removing any reference
	 * @param mixed input
	 * @return mixed
	 */

	Public.clone = function(input) {

		var output = input,
			type = typeOf(input),
			index, size;

		if (type === 'array') {

			output = [];
			size = input.length;

			for (index=0;index<size;++index)

				output[index] = Public.clone(input[index]);

		} else if (type === 'object') {

			output = {};

			for (index in input)

				output[index] = Public.clone(input[index]);

		}

		return output;

	};

	/**
	 * Merge two objects recursively
	 * @param mixed input
	 * @param mixed extend
	 * @return mixed
	 */

	function merge_recursive(base, extend) {

		if (typeOf(base) !== 'object')

			return extend;

		for (var key in extend) {

			if (typeOf(base[key]) === 'object' && typeOf(extend[key]) === 'object') {

				base[key] = merge_recursive(base[key], extend[key]);

			} else {

				base[key] = extend[key];

			}

		}

		return base;

	}

	/**
	 * Merge two or more objects
	 * @param bool clone
	 * @param bool recursive
	 * @param array argv
	 * @return object
	 */

	function merge(clone, recursive, argv) {

		var result = argv[0],
			size = argv.length;

		if (clone || typeOf(result) !== 'object')

			result = {};

		for (var index=0;index<size;++index) {

			var item = argv[index],

				type = typeOf(item);

			if (type !== 'object') continue;

			for (var key in item) {

				var sitem = clone ? Public.clone(item[key]) : item[key];

				if (recursive) {

					result[key] = merge_recursive(result[key], sitem);

				} else {

					result[key] = sitem;

				}

			}

		}

		return result;

	}

	/**
	 * Get type of variable
	 * @param mixed input
	 * @return string
	 *
	 * @see http://jsperf.com/typeofvar
	 */

	function typeOf(input) {

		return ({}).toString.call(input).slice(8, -1).toLowerCase();

	}

	if (isNode) {

		module.exports = Public;

	} else {

		window[publicName] = Public;

	}

})(typeof module === 'object' && module && typeof module.exports === 'object' && module.exports);
},{}],8:[function(require,module,exports){
/**
  # normalice

  Normalize an ice server configuration object (or plain old string) into a format
  that is usable in all browsers supporting WebRTC.  Primarily this module is designed
  to help with the transition of the `url` attribute of the configuration object to
  the `urls` attribute.

  ## Example Usage

  <<< examples/simple.js

**/

var protocols = [
  'stun:',
  'turn:'
];

module.exports = function(input) {
  var url = (input || {}).url || input;
  var protocol;
  var parts;
  var output = {};

  // if we don't have a string url, then allow the input to passthrough
  if (typeof url != 'string' && (! (url instanceof String))) {
    return input;
  }

  // trim the url string, and convert to an array
  url = url.trim();

  // if the protocol is not known, then passthrough
  protocol = protocols[protocols.indexOf(url.slice(0, 5))];
  if (! protocol) {
    return input;
  }

  // now let's attack the remaining url parts
  url = url.slice(5);
  parts = url.split('@');

  output.username = input.username;
  output.credential = input.credential;
  // if we have an authentication part, then set the credentials
  if (parts.length > 1) {
    url = parts[1];
    parts = parts[0].split(':');

    // add the output credential and username
    output.username = parts[0];
    output.credential = (input || {}).credential || parts[1] || '';
  }

  output.url = protocol + url;
  output.urls = [ output.url ];

  return output;
};

},{}],9:[function(require,module,exports){
(function (global){
/*!
 * Platform.js <https://mths.be/platform>
 * Copyright 2014-2018 Benjamin Tan <https://bnjmnt4n.now.sh/>
 * Copyright 2011-2013 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <https://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object. */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object. */
  var oldRoot = root;

  /** Detect free variable `exports`. */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module`. */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root`. */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Regular expression to detect Opera. */
  var reOpera = /\bOpera/;

  /** Possible global object. */
  var thisBinding = this;

  /** Used for native method references. */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values. */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // Platform tokens are defined at:
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '10.0': '10',
      '6.4':  '10 Technical Preview',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // Detect Windows version from platform tokens.
    if (pattern && label && /^Win/i.test(os) && !/^Windows Phone /i.test(os) &&
        (data = data[/[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // Correct character case and cleanup string.
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .replace(/\b(Chrome OS \w+) [\d.]+\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object. */
    var context = root;

    /** Used to flag when a custom context is provided. */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // Juggle arguments.
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object. */
    var nav = context.navigator || {};

    /** Browser user agent string. */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope]. */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome. */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts. */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environments. */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino. */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha. */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta. */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object. */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based).
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]`. */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime. */
    var data;

    /** The CPU architecture. */
    var arch = ua;

    /** Platform description array. */
    var description = [];

    /** Platform alpha/beta indicator. */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform. */
    var useFeatures = ua == userAgent;

    /** The browser/environment version. */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important). */
    var layout = getLayout([
      { 'label': 'EdgeHTML', 'pattern': 'Edge' },
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important). */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Electron',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      { 'label': 'Microsoft Edge', 'pattern': 'Edge' },
      'Midori',
      'Nook Browser',
      'PaleMoon',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      { 'label': 'Samsung Internet', 'pattern': 'SamsungBrowser' },
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'Sunrise',
      'Swiftfox',
      'Waterfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'Firefox for iOS', 'pattern': 'FxiOS' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important). */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      { 'label': 'Galaxy S5', 'pattern': 'SM-G900' },
      { 'label': 'Galaxy S6', 'pattern': 'SM-G920' },
      { 'label': 'Galaxy S6 Edge', 'pattern': 'SM-G925' },
      { 'label': 'Galaxy S7', 'pattern': 'SM-G930' },
      { 'label': 'Galaxy S7 Edge', 'pattern': 'SM-G935' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nexus',
      'Nook',
      'PlayBook',
      'PlayStation Vita',
      'PlayStation',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers. */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Archos': {},
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1, 'Nexus': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable operating systems (order is important). */
    var os = getOS([
      'Windows Phone',
      'Android',
      'CentOS',
      { 'label': 'Chrome OS', 'pattern': 'CrOS' },
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'OpenBSD',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Tizen',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // Lookup the manufacturer by product or scan the UA for the manufacturer.
        return result || (
          value[product] ||
          value[/^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + ' *\\w+-[\\w]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // Split by forward slash and append product version if needed.
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // Correct character case and cleanup string.
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // Convert layout to an array so we can add extra details.
    layout && (layout = [layout]);

    // Detect product names that contain their manufacturer's name.
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // Clean up Google TV.
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // Detect simulators.
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // Detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS.
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // Detect IE Mobile 11.
    if (name == 'IE' && /\blike iPhone OS\b/.test(ua)) {
      data = parse(ua.replace(/like iPhone OS/, ''));
      manufacturer = data.manufacturer;
      product = data.product;
    }
    // Detect iOS.
    else if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // Detect Kubuntu.
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // Detect Android browsers.
    else if ((manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) ||
        (/\bAndroid\b/.test(os) && /^Chrome/.test(name) && /\bVersion\//i.test(ua))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // Detect Silk desktop/accelerated modes.
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // Detect PaleMoon identifying as Firefox.
    else if (name == 'PaleMoon' && (data = /\bFirefox\/([\d.]+)\b/.exec(ua))) {
      description.push('identifying as Firefox ' + data[1]);
    }
    // Detect Firefox OS and products running Firefox.
    else if (name == 'Firefox' && (data = /\b(Mobile|Tablet|TV)\b/i.exec(ua))) {
      os || (os = 'Firefox OS');
      product || (product = data[1]);
    }
    // Detect false positives for Firefox/Safari.
    else if (!name || (data = !/\bMinefield\b/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // Escape the `/` for Firefox 1.
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // Clear name of false positives.
        name = null;
      }
      // Reassign a generic name.
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // Add Chrome version to description for Electron.
    else if (name == 'Electron' && (data = (/\bChrome\/([\d.]+)\b/.exec(ua) || 0)[1])) {
      description.push('Chromium ' + data);
    }
    // Detect non-Opera (Presto-based) versions (order is important).
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|Edge|FxiOS|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|SamsungBrowser|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // Detect stubborn layout engines.
    if ((data =
          layout == 'iCab' && parseFloat(version) > 3 && 'WebKit' ||
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && !/^(?:Trident|EdgeHTML)$/.test(layout) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident') ||
          layout == 'WebKit' && /\bPlayStation\b(?! Vita\b)/i.test(name) && 'NetFront'
        )) {
      layout = [data];
    }
    // Detect Windows Phone 7 desktop mode.
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // Detect Windows Phone 8.x desktop mode.
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8.x';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // Detect IE 11 identifying as other browsers.
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (name) {
        description.push('identifying as ' + name + (version ? ' ' + version : ''));
      }
      name = 'IE';
      version = data[1];
    }
    // Leverage environment features.
    if (useFeatures) {
      // Detect server-side environments.
      // Rhino has a global function while others have a global object.
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (rhino) {
          try {
            version = context.require('ringo/engine').version.join('.');
            name = 'RingoJS';
          } catch(e) {
            if ((data = context.system) && data.global.system == context.system) {
              name = 'Narwhal';
              os || (os = data[0].os || null);
            }
          }
          if (!name) {
            name = 'Rhino';
          }
        }
        else if (
          typeof context.process == 'object' && !context.process.browser &&
          (data = context.process)
        ) {
          if (typeof data.versions == 'object') {
            if (typeof data.versions.electron == 'string') {
              description.push('Node ' + data.versions.node);
              name = 'Electron';
              version = data.versions.electron;
            } else if (typeof data.versions.nw == 'string') {
              description.push('Chromium ' + version, 'Node ' + data.versions.node);
              name = 'NW.js';
              version = data.versions.nw;
            }
          }
          if (!name) {
            name = 'Node.js';
            arch = data.arch;
            os = data.platform;
            version = /[\d.]+/.exec(data.version);
            version = version ? version[0] : null;
          }
        }
      }
      // Detect Adobe AIR.
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // Detect PhantomJS.
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // Detect IE compatibility modes.
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // We're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode.
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      // Detect IE 11 masking as other browsers.
      else if (typeof doc.documentMode == 'number' && /^(?:Chrome|Firefox)\b/.test(name)) {
        description.push('masking as ' + name + ' ' + version);
        name = 'IE';
        version = '11.0';
        layout = ['Trident'];
        os = 'Windows';
      }
      os = os && format(os);
    }
    // Detect prerelease phases.
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // Detect Firefox Mobile.
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // Obscure Maxthon's unreliable version.
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // Detect Xbox 360 and Xbox One.
    else if (/\bXbox\b/i.test(product)) {
      if (product == 'Xbox 360') {
        os = null;
      }
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // Add mobile postfix.
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // Detect IE platform preview.
    else if (name == 'IE' && useFeatures) {
      try {
        if (context.external === null) {
          description.unshift('platform preview');
        }
      } catch(e) {
        description.unshift('embedded');
      }
    }
    // Detect BlackBerry OS version.
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // Detect Opera identifying/masking itself as another browser.
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && product != 'Wii' && (
          (useFeatures && opera) ||
          (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
          (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
          (name == 'IE' && (
            (os && !/^Win/.test(os) && version > 5.5) ||
            /\bWindows XP\b/.test(os) && version > 8 ||
            version == 8 && !/\bTrident\b/.test(ua)
          ))
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {
      // When "identifying", the UA contains both Opera and the other browser's name.
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // When "masking", the UA contains only the other browser's name.
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // Detect WebKit Nightly and approximate Chrome/Safari versions.
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // Correct build number for numeric comparison.
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // Nightly builds are postfixed with a "+".
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // Clear incorrect browser versions.
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // Use the full Chrome version when available.
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // Detect Blink layout engine.
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && layout == 'WebKit') {
        layout = ['Blink'];
      }
      // Detect JavaScriptCore.
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // Add the postfix of ".x" or "+" for approximate versions.
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // Obscure version for some Safari 1-2 releases.
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // Detect Opera desktop modes.
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // Detect Chrome desktop mode.
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // Strip incorrect OS versions.
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // Add layout engine.
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        name != 'Safari' && /^iOS/.test(os) && /\bSafari\b/.test(layout[1]) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Samsung Internet|Sleipnir|Web)/.test(name) && layout[1])) {
      // Don't add layout details to description if they are falsey.
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // Combine contextual information.
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // Append manufacturer to description.
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // Append product to description.
    if (product) {
      description.push((/^on /.test(description[description.length - 1]) ? '' : 'on ') + product);
    }
    // Parse the OS into an object.
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // Add browser/OS architecture.
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }
    // Chrome 39 and above on OS X is always 64-bit.
    else if (
        os && /^OS X/.test(os.family) &&
        name == 'Chrome' && parseFloat(version) >= 39
    ) {
      os.architecture = 64;
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * The list of common layout engines include:
     * "Blink", "EdgeHTML", "Gecko", "Trident" and "WebKit"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * The list of manufacturers include:
     * "Apple", "Archos", "Amazon", "Asus", "Barnes & Noble", "BlackBerry",
     * "Google", "HP", "HTC", "LG", "Microsoft", "Motorola", "Nintendo",
     * "Nokia", "Samsung" and "Sony"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * The list of common browser names include:
     * "Chrome", "Electron", "Firefox", "Firefox for iOS", "IE",
     * "Microsoft Edge", "PhantomJS", "Safari", "SeaMonkey", "Silk",
     * "Opera Mini" and "Opera"
     *
     * Mobile versions of some browsers have "Mobile" appended to their name:
     * eg. "Chrome Mobile", "Firefox Mobile", "IE Mobile" and "Opera Mobile"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * The list of common products include:
     *
     * "BlackBerry", "Galaxy S4", "Lumia", "iPad", "iPod", "iPhone", "Kindle",
     * "Kindle Fire", "Nexus", "Nook", "PlayBook", "TouchPad" and "Transformer"
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // Export platform.
  var platform = parse();

  // Some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Expose platform on the global object to prevent errors when platform is
    // loaded by a script tag in the presence of an AMD loader.
    // See http://requirejs.org/docs/errors.html#mismatch for more details.
    root.platform = platform;

    // Define as an anonymous module so platform can be aliased through path mapping.
    define(function() {
      return platform;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for CommonJS support.
    forOwn(platform, function(value, key) {
      freeExports[key] = value;
    });
  }
  else {
    // Export to the global object.
    root.platform = platform;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
var grammar = module.exports = {
  v: [{
      name: 'version',
      reg: /^(\d*)$/
  }],
  o: [{ //o=- 20518 0 IN IP4 203.0.113.1
    // NB: sessionId will be a String in most cases because it is huge
    name: 'origin',
    reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
    names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
    format: "%s %s %d %s IP%d %s"
  }],
  // default parsing of these only (though some of these feel outdated)
  s: [{ name: 'name' }],
  i: [{ name: 'description' }],
  u: [{ name: 'uri' }],
  e: [{ name: 'email' }],
  p: [{ name: 'phone' }],
  z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
  r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
  //k: [{}], // outdated thing ignored
  t: [{ //t=0 0
    name: 'timing',
    reg: /^(\d*) (\d*)/,
    names: ['start', 'stop'],
    format: "%d %d"
  }],
  c: [{ //c=IN IP4 10.47.197.26
      name: 'connection',
      reg: /^IN IP(\d) (\S*)/,
      names: ['version', 'ip'],
      format: "IN IP%d %s"
  }],
  b: [{ //b=AS:4000
      push: 'bandwidth',
      reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
      names: ['type', 'limit'],
      format: "%s:%s"
  }],
  m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
      // NB: special - pushes to session
      // TODO: rtp/fmtp should be filtered by the payloads found here?
      reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
      names: ['type', 'port', 'protocol', 'payloads'],
      format: "%s %d %s %s"
  }],
  a: [
    { //a=rtpmap:110 opus/48000/2
      push: 'rtp',
      reg: /^rtpmap:(\d*) ([\w\-]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
      names: ['payload', 'codec', 'rate', 'encoding'],
      format: function (o) {
        return (o.encoding) ?
          "rtpmap:%d %s/%s/%s":
          o.rate ?
          "rtpmap:%d %s/%s":
          "rtpmap:%d %s";
      }
    },
    {
      //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
      //a=fmtp:111 minptime=10; useinbandfec=1
      push: 'fmtp',
      reg: /^fmtp:(\d*) ([\S| ]*)/,
      names: ['payload', 'config'],
      format: "fmtp:%d %s"
    },
    { //a=control:streamid=0
        name: 'control',
        reg: /^control:(.*)/,
        format: "control:%s"
    },
    { //a=rtcp:65179 IN IP4 193.84.77.194
      name: 'rtcp',
      reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
      names: ['port', 'netType', 'ipVer', 'address'],
      format: function (o) {
        return (o.address != null) ?
          "rtcp:%d %s IP%d %s":
          "rtcp:%d";
      }
    },
    { //a=rtcp-fb:98 trr-int 100
      push: 'rtcpFbTrrInt',
      reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
      names: ['payload', 'value'],
      format: "rtcp-fb:%d trr-int %d"
    },
    { //a=rtcp-fb:98 nack rpsi
      push: 'rtcpFb',
      reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
      names: ['payload', 'type', 'subtype'],
      format: function (o) {
        return (o.subtype != null) ?
          "rtcp-fb:%s %s %s":
          "rtcp-fb:%s %s";
      }
    },
    { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
      //a=extmap:1/recvonly URI-gps-string
      push: 'ext',
      reg: /^extmap:([\w_\/]*) (\S*)(?: (\S*))?/,
      names: ['value', 'uri', 'config'], // value may include "/direction" suffix
      format: function (o) {
        return (o.config != null) ?
          "extmap:%s %s %s":
          "extmap:%s %s";
      }
    },
    {
      //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
      push: 'crypto',
      reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
      names: ['id', 'suite', 'config', 'sessionConfig'],
      format: function (o) {
        return (o.sessionConfig != null) ?
          "crypto:%d %s %s %s":
          "crypto:%d %s %s";
      }
    },
    { //a=setup:actpass
      name: 'setup',
      reg: /^setup:(\w*)/,
      format: "setup:%s"
    },
    { //a=mid:1
      name: 'mid',
      reg: /^mid:([^\s]*)/,
      format: "mid:%s"
    },
    { //a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
      name: 'msid',
      reg: /^msid:(.*)/,
      format: "msid:%s"
    },
    { //a=ptime:20
      name: 'ptime',
      reg: /^ptime:(\d*)/,
      format: "ptime:%d"
    },
    { //a=maxptime:60
      name: 'maxptime',
      reg: /^maxptime:(\d*)/,
      format: "maxptime:%d"
    },
    { //a=sendrecv
      name: 'direction',
      reg: /^(sendrecv|recvonly|sendonly|inactive)/
    },
    { //a=ice-lite
      name: 'icelite',
      reg: /^(ice-lite)/
    },
    { //a=ice-ufrag:F7gI
      name: 'iceUfrag',
      reg: /^ice-ufrag:(\S*)/,
      format: "ice-ufrag:%s"
    },
    { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
      name: 'icePwd',
      reg: /^ice-pwd:(\S*)/,
      format: "ice-pwd:%s"
    },
    { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
      name: 'fingerprint',
      reg: /^fingerprint:(\S*) (\S*)/,
      names: ['type', 'hash'],
      format: "fingerprint:%s %s"
    },
    {
      //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
      //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0
      //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0
      //a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0
      //a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0
      push:'candidates',
      reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?/,
      names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'tcptype', 'generation'],
      format: function (o) {
        var str = "candidate:%s %d %s %d %s %d typ %s";

        str += (o.raddr != null) ? " raddr %s rport %d" : "%v%v";

        // NB: candidate has three optional chunks, so %void middles one if it's missing
        str += (o.tcptype != null) ? " tcptype %s" : "%v";

        if (o.generation != null) {
          str += " generation %d";
        }
        return str;
      }
    },
    { //a=end-of-candidates (keep after the candidates line for readability)
      name: 'endOfCandidates',
      reg: /^(end-of-candidates)/
    },
    { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
      name: 'remoteCandidates',
      reg: /^remote-candidates:(.*)/,
      format: "remote-candidates:%s"
    },
    { //a=ice-options:google-ice
      name: 'iceOptions',
      reg: /^ice-options:(\S*)/,
      format: "ice-options:%s"
    },
    { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
      push: "ssrcs",
      reg: /^ssrc:(\d*) ([\w_]*):(.*)/,
      names: ['id', 'attribute', 'value'],
      format: "ssrc:%d %s:%s"
    },
    { //a=ssrc-group:FEC 1 2
      push: "ssrcGroups",
      reg: /^ssrc-group:(\w*) (.*)/,
      names: ['semantics', 'ssrcs'],
      format: "ssrc-group:%s %s"
    },
    { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
      name: "msidSemantic",
      reg: /^msid-semantic:\s?(\w*) (\S*)/,
      names: ['semantic', 'token'],
      format: "msid-semantic: %s %s" // space after ":" is not accidental
    },
    { //a=group:BUNDLE audio video
      push: 'groups',
      reg: /^group:(\w*) (.*)/,
      names: ['type', 'mids'],
      format: "group:%s %s"
    },
    { //a=rtcp-mux
      name: 'rtcpMux',
      reg: /^(rtcp-mux)/
    },
    { //a=rtcp-rsize
      name: 'rtcpRsize',
      reg: /^(rtcp-rsize)/
    },
    { // any a= that we don't understand is kepts verbatim on media.invalid
      push: 'invalid',
      names: ["value"]
    }
  ]
};

// set sensible defaults to avoid polluting the grammar with boring details
Object.keys(grammar).forEach(function (key) {
  var objs = grammar[key];
  objs.forEach(function (obj) {
    if (!obj.reg) {
      obj.reg = /(.*)/;
    }
    if (!obj.format) {
      obj.format = "%s";
    }
  });
});

},{}],11:[function(require,module,exports){
var parser = require('./parser');
var writer = require('./writer');

exports.write = writer;
exports.parse = parser.parse;
exports.parseFmtpConfig = parser.parseFmtpConfig;
exports.parsePayloads = parser.parsePayloads;
exports.parseRemoteCandidates = parser.parseRemoteCandidates;

},{"./parser":12,"./writer":13}],12:[function(require,module,exports){
var toIntIfInt = function (v) {
  return String(Number(v)) === v ? Number(v) : v;
};

var attachProperties = function (match, location, names, rawName) {
  if (rawName && !names) {
    location[rawName] = toIntIfInt(match[1]);
  }
  else {
    for (var i = 0; i < names.length; i += 1) {
      if (match[i+1] != null) {
        location[names[i]] = toIntIfInt(match[i+1]);
      }
    }
  }
};

var parseReg = function (obj, location, content) {
  var needsBlank = obj.name && obj.names;
  if (obj.push && !location[obj.push]) {
    location[obj.push] = [];
  }
  else if (needsBlank && !location[obj.name]) {
    location[obj.name] = {};
  }
  var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
    needsBlank ? location[obj.name] : location; // otherwise, named location or root

  attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

  if (obj.push) {
    location[obj.push].push(keyLocation);
  }
};

var grammar = require('./grammar');
var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);

exports.parse = function (sdp) {
  var session = {}
    , media = []
    , location = session; // points at where properties go under (one of the above)

  // parse lines we understand
  sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function (l) {
    var type = l[0];
    var content = l.slice(2);
    if (type === 'm') {
      media.push({rtp: [], fmtp: []});
      location = media[media.length-1]; // point at latest media line
    }

    for (var j = 0; j < (grammar[type] || []).length; j += 1) {
      var obj = grammar[type][j];
      if (obj.reg.test(content)) {
        return parseReg(obj, location, content);
      }
    }
  });

  session.media = media; // link it up
  return session;
};

var fmtpReducer = function (acc, expr) {
  var s = expr.split('=');
  if (s.length === 2) {
    acc[s[0]] = toIntIfInt(s[1]);
  }
  return acc;
};

exports.parseFmtpConfig = function (str) {
  return str.split(/\;\s?/).reduce(fmtpReducer, {});
};

exports.parsePayloads = function (str) {
  return str.split(' ').map(Number);
};

exports.parseRemoteCandidates = function (str) {
  var candidates = [];
  var parts = str.split(' ').map(toIntIfInt);
  for (var i = 0; i < parts.length; i += 3) {
    candidates.push({
      component: parts[i],
      ip: parts[i + 1],
      port: parts[i + 2]
    });
  }
  return candidates;
};

},{"./grammar":10}],13:[function(require,module,exports){
var grammar = require('./grammar');

// customized util.format - discards excess arguments and can void middle ones
var formatRegExp = /%[sdv%]/g;
var format = function (formatStr) {
  var i = 1;
  var args = arguments;
  var len = args.length;
  return formatStr.replace(formatRegExp, function (x) {
    if (i >= len) {
      return x; // missing argument
    }
    var arg = args[i];
    i += 1;
    switch (x) {
      case '%%':
        return '%';
      case '%s':
        return String(arg);
      case '%d':
        return Number(arg);
      case '%v':
        return '';
    }
  });
  // NB: we discard excess arguments - they are typically undefined from makeLine
};

var makeLine = function (type, obj, location) {
  var str = obj.format instanceof Function ?
    (obj.format(obj.push ? location : location[obj.name])) :
    obj.format;

  var args = [type + '=' + str];
  if (obj.names) {
    for (var i = 0; i < obj.names.length; i += 1) {
      var n = obj.names[i];
      if (obj.name) {
        args.push(location[obj.name][n]);
      }
      else { // for mLine and push attributes
        args.push(location[obj.names[i]]);
      }
    }
  }
  else {
    args.push(location[obj.name]);
  }
  return format.apply(null, args);
};

// RFC specified order
// TODO: extend this with all the rest
var defaultOuterOrder = [
  'v', 'o', 's', 'i',
  'u', 'e', 'p', 'c',
  'b', 't', 'r', 'z', 'a'
];
var defaultInnerOrder = ['i', 'c', 'b', 'a'];


module.exports = function (session, opts) {
  opts = opts || {};
  // ensure certain properties exist
  if (session.version == null) {
    session.version = 0; // "v=0" must be there (only defined version atm)
  }
  if (session.name == null) {
    session.name = " "; // "s= " must be there if no meaningful name set
  }
  session.media.forEach(function (mLine) {
    if (mLine.payloads == null) {
      mLine.payloads = "";
    }
  });

  var outerOrder = opts.outerOrder || defaultOuterOrder;
  var innerOrder = opts.innerOrder || defaultInnerOrder;
  var sdp = [];

  // loop through outerOrder for matching properties on session
  outerOrder.forEach(function (type) {
    grammar[type].forEach(function (obj) {
      if (obj.name in session && session[obj.name] != null) {
        sdp.push(makeLine(type, obj, session));
      }
      else if (obj.push in session && session[obj.push] != null) {
        session[obj.push].forEach(function (el) {
          sdp.push(makeLine(type, obj, el));
        });
      }
    });
  });

  // then for each media line, follow the innerOrder
  session.media.forEach(function (mLine) {
    sdp.push(makeLine('m', grammar.m[0], mLine));

    innerOrder.forEach(function (type) {
      grammar[type].forEach(function (obj) {
        if (obj.name in mLine && mLine[obj.name] != null) {
          sdp.push(makeLine(type, obj, mLine));
        }
        else if (obj.push in mLine && mLine[obj.push] != null) {
          mLine[obj.push].forEach(function (el) {
            sdp.push(makeLine(type, obj, el));
          });
        }
      });
    });
  });

  return sdp.join('\r\n') + '\r\n';
};

},{"./grammar":10}],14:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = function arrayEquals(array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time
    if (this.length != array.length)
        return false;

    for (var i = 0, l = this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!arrayEquals.apply(this[i], [array[i]]))
                return false;
        } else if (this[i] != array[i]) {
            // Warning - two different object instances will never be equal:
            // {x:20} != {x:20}
            return false;
        }
    }
    return true;
};


},{}],15:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

exports.Interop = require('./interop');

},{"./interop":16}],16:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global RTCSessionDescription */
/* global RTCIceCandidate */
/* jshint -W097 */
"use strict";

var transform = require('./transform');
var arrayEquals = require('./array-equals');

function Interop() {

    /**
     * This map holds the most recent Unified Plan offer/answer SDP that was
     * converted to Plan B, with the SDP type ('offer' or 'answer') as keys and
     * the SDP string as values.
     *
     * @type {{}}
     */
    this.cache = {
        mlB2UMap : {},
        mlU2BMap : {}
    };
}

module.exports = Interop;

/**
 * Changes the candidate args to match with the related Unified Plan
 */
Interop.prototype.candidateToUnifiedPlan = function(candidate) {
    var cand = new RTCIceCandidate(candidate);

    cand.sdpMLineIndex = this.cache.mlB2UMap[cand.sdpMLineIndex];
    /* TODO: change sdpMid to (audio|video)-SSRC */

    return cand;
};

/**
 * Changes the candidate args to match with the related Plan B
 */
Interop.prototype.candidateToPlanB = function(candidate) {
    var cand = new RTCIceCandidate(candidate);

    if (cand.sdpMid.indexOf('audio') === 0) {
      cand.sdpMid = 'audio';
    } else if (cand.sdpMid.indexOf('video') === 0) {
      cand.sdpMid = 'video';
    } else {
      throw new Error('candidate with ' + cand.sdpMid + ' not allowed');
    }

    cand.sdpMLineIndex = this.cache.mlU2BMap[cand.sdpMLineIndex];

    return cand;
};

/**
 * Returns the index of the first m-line with the given media type and with a
 * direction which allows sending, in the last Unified Plan description with
 * type "answer" converted to Plan B. Returns {null} if there is no saved
 * answer, or if none of its m-lines with the given type allow sending.
 * @param type the media type ("audio" or "video").
 * @returns {*}
 */
Interop.prototype.getFirstSendingIndexFromAnswer = function(type) {
    if (!this.cache.answer) {
        return null;
    }

    var session = transform.parse(this.cache.answer);
    if (session && session.media && Array.isArray(session.media)){
        for (var i = 0; i < session.media.length; i++) {
            if (session.media[i].type == type &&
                (!session.media[i].direction /* default to sendrecv */ ||
                    session.media[i].direction === 'sendrecv' ||
                    session.media[i].direction === 'sendonly')){
                return i;
            }
        }
    }

    return null;
};

/**
 * This method transforms a Unified Plan SDP to an equivalent Plan B SDP. A
 * PeerConnection wrapper transforms the SDP to Plan B before passing it to the
 * application.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toPlanB = function(desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    // Objectify the SDP for easier manipulation.
    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Unified Plan SDP. Plan B
    // SDP has a video, an audio and a data "channel" at most.
    if (session.media.length <= 3 && session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Unified Plan.');
        return desc;
    }

    //#endregion

    // HACK https://bugzilla.mozilla.org/show_bug.cgi?id=1113443
    var sdp = desc.sdp;
    var rewrite = false;
    for (var i = 0; i < session.media.length; i++) {
        var uLine = session.media[i];
        uLine.rtp.forEach(function(rtp) {
            if (rtp.codec === 'NULL')
            {
                rewrite = true;
                var offer = transform.parse(self.cache.offer);
                rtp.codec = offer.media[i].rtp[0].codec;
            }
        });
    }
    if (rewrite) {
        sdp = transform.write(session);
    }

    // Unified Plan SDP is our "precious". Cache it for later use in the Plan B
    // -> Unified Plan transformation.
    this.cache[desc.type] = sdp;

    //#region Convert from Unified Plan to Plan B.

    // We rebuild the session.media array.
    var media = session.media;
    session.media = [];

    // Associative array that maps channel types to channel objects for fast
    // access to channel objects by their type, e.g. type2bl['audio']->channel
    // obj.
    var type2bl = {};

    // Used to build the group:BUNDLE value after the channels construction
    // loop.
    var types = [];

    media.forEach(function(uLine) {
        // rtcp-mux is required in the Plan B SDP.
        if ((typeof uLine.rtcpMux !== 'string' ||
            uLine.rtcpMux !== 'rtcp-mux') &&
            uLine.direction !== 'inactive') {
            throw new Error('Cannot convert to Plan B because m-lines ' +
                'without the rtcp-mux attribute were found.');
        }

        // If we don't have a channel for this uLine.type OR the selected is
        // inactive, then select this uLine as the channel basis.
        if (typeof type2bl[uLine.type] === 'undefined' ||
            type2bl[uLine.type].direction === 'inactive') {
            type2bl[uLine.type] = uLine;
        }

        if (uLine.protocol != type2bl[uLine.type].protocol) {
          throw new Error('Cannot convert to Plan B because m-lines ' +
              'have different protocols and this library does not have ' +
              'support for that');
        }

        if (uLine.payloads != type2bl[uLine.type].payloads) {
          throw new Error('Cannot convert to Plan B because m-lines ' +
              'have different payloads and this library does not have ' +
              'support for that');
        }

    });

    // Implode the Unified Plan m-lines/tracks into Plan B channels.
    media.forEach(function(uLine) {
        if (uLine.type === 'application') {
            session.media.push(uLine);
            types.push(uLine.mid);
            return;
        }

        // Add sources to the channel and handle a=msid.
        if (typeof uLine.sources === 'object') {
            Object.keys(uLine.sources).forEach(function(ssrc) {
                if (typeof type2bl[uLine.type].sources !== 'object')
                    type2bl[uLine.type].sources = {};

                // Assign the sources to the channel.
                type2bl[uLine.type].sources[ssrc] =
                    uLine.sources[ssrc];

                if (typeof uLine.msid !== 'undefined') {
                    // In Plan B the msid is an SSRC attribute. Also, we don't
                    // care about the obsolete label and mslabel attributes.
                    //
                    // Note that it is not guaranteed that the uLine will
                    // have an msid. recvonly channels in particular don't have
                    // one.
                    type2bl[uLine.type].sources[ssrc].msid =
                        uLine.msid;
                }
                // NOTE ssrcs in ssrc groups will share msids, as
                // draft-uberti-rtcweb-plan-00 mandates.
            });
        }

        // Add ssrc groups to the channel.
        if (typeof uLine.ssrcGroups !== 'undefined' &&
                Array.isArray(uLine.ssrcGroups)) {

            // Create the ssrcGroups array, if it's not defined.
            if (typeof type2bl[uLine.type].ssrcGroups === 'undefined' ||
                    !Array.isArray(type2bl[uLine.type].ssrcGroups)) {
                type2bl[uLine.type].ssrcGroups = [];
            }

            type2bl[uLine.type].ssrcGroups =
                type2bl[uLine.type].ssrcGroups.concat(
                    uLine.ssrcGroups);
        }

        if (type2bl[uLine.type] === uLine) {
            // Plan B mids are in ['audio', 'video', 'data']
            uLine.mid = uLine.type;

            // Plan B doesn't support/need the bundle-only attribute.
            delete uLine.bundleOnly;

            // In Plan B the msid is an SSRC attribute.
            delete uLine.msid;

	    if (uLine.type == media[0].type) {
	      types.unshift(uLine.type);
	      // Add the channel to the new media array.
	      session.media.unshift(uLine);
	    } else {
	      types.push(uLine.type);
	      // Add the channel to the new media array.
	      session.media.push(uLine);
	    }
        }
    });

    if (typeof session.groups !== 'undefined') {
      // We regenerate the BUNDLE group with the new mids.
      session.groups.some(function(group) {
	  if (group.type === 'BUNDLE') {
	      group.mids = types.join(' ');
	      return true;
	  }
      });
    }

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};

/* follow rules defined in RFC4145 */
function addSetupAttr(uLine) {
    if (typeof uLine.setup === 'undefined') {
        return;
    }

    if (uLine.setup === "active") {
            uLine.setup = "passive";
    } else if (uLine.setup === "passive") {
        uLine.setup = "active";
    }
}

/**
 * This method transforms a Plan B SDP to an equivalent Unified Plan SDP. A
 * PeerConnection wrapper transforms the SDP to Unified Plan before passing it
 * to FF.
 *
 * @param desc
 * @returns {*}
 */
Interop.prototype.toUnifiedPlan = function(desc) {
    var self = this;
    //#region Preliminary input validation.

    if (typeof desc !== 'object' || desc === null ||
        typeof desc.sdp !== 'string') {
        console.warn('An empty description was passed as an argument.');
        return desc;
    }

    var session = transform.parse(desc.sdp);

    // If the SDP contains no media, there's nothing to transform.
    if (typeof session.media === 'undefined' ||
        !Array.isArray(session.media) || session.media.length === 0) {
        console.warn('The description has no media.');
        return desc;
    }

    // Try some heuristics to "make sure" this is a Plan B SDP. Plan B SDP has
    // a video, an audio and a data "channel" at most.
    if (session.media.length > 3 || !session.media.every(function(m) {
            return ['video', 'audio', 'data'].indexOf(m.mid) !== -1;
        })) {
        console.warn('This description does not look like Plan B.');
        return desc;
    }

    // Make sure this Plan B SDP can be converted to a Unified Plan SDP.
    var mids = [];
    session.media.forEach(function(m) {
        mids.push(m.mid);
    });

    var hasBundle = false;
    if (typeof session.groups !== 'undefined' &&
        Array.isArray(session.groups)) {
        hasBundle = session.groups.every(function(g) {
            return g.type !== 'BUNDLE' ||
                arrayEquals.apply(g.mids.sort(), [mids.sort()]);
        });
    }

    if (!hasBundle) {
        var mustBeBundle = false;

        session.media.forEach(function(m) {
            if (m.direction !== 'inactive') {
                mustBeBundle = true;
            }
        });

        if (mustBeBundle) {
            throw new Error("Cannot convert to Unified Plan because m-lines that" +
              " are not bundled were found.");
        }
    }

    //#endregion


    //#region Convert from Plan B to Unified Plan.

    // Unfortunately, a Plan B offer/answer doesn't have enough information to
    // rebuild an equivalent Unified Plan offer/answer.
    //
    // For example, if this is a local answer (in Unified Plan style) that we
    // convert to Plan B prior to handing it over to the application (the
    // PeerConnection wrapper called us, for instance, after a successful
    // createAnswer), we want to remember the m-line at which we've seen the
    // (local) SSRC. That's because when the application wants to do call the
    // SLD method, forcing us to do the inverse transformation (from Plan B to
    // Unified Plan), we need to know to which m-line to assign the (local)
    // SSRC. We also need to know all the other m-lines that the original
    // answer had and include them in the transformed answer as well.
    //
    // Another example is if this is a remote offer that we convert to Plan B
    // prior to giving it to the application, we want to remember the mid at
    // which we've seen the (remote) SSRC.
    //
    // In the iteration that follows, we use the cached Unified Plan (if it
    // exists) to assign mids to ssrcs.

    var type;
    if (desc.type === 'answer') {
        type = 'offer';
    } else if (desc.type === 'offer') {
        type = 'answer';
    } else {
        throw new Error("Type '" + desc.type + "' not supported.");
    }

    var cached;
    if (typeof this.cache[type] !== 'undefined') {
        cached = transform.parse(this.cache[type]);
    }

    var recvonlySsrcs = {
        audio: {},
        video: {}
    };

    // A helper map that sends mids to m-line objects. We use it later to
    // rebuild the Unified Plan style session.media array.
    var mid2ul = {};
    var bIdx = 0;
    var uIdx = 0;

    var sources2ul = {};

    var candidates;
    var iceUfrag;
    var icePwd;
    var fingerprint;
    var payloads = {};
    var rtcpFb = {};
    var rtp = {};

    session.media.forEach(function(bLine) {
        if ((typeof bLine.rtcpMux !== 'string' ||
            bLine.rtcpMux !== 'rtcp-mux') &&
            bLine.direction !== 'inactive') {
            throw new Error("Cannot convert to Unified Plan because m-lines " +
                "without the rtcp-mux attribute were found.");
        }

        if (bLine.type === 'application') {
            mid2ul[bLine.mid] = bLine;
            return;
        }

        // With rtcp-mux and bundle all the channels should have the same ICE
        // stuff.
        var sources = bLine.sources;
        var ssrcGroups = bLine.ssrcGroups;
        var port = bLine.port;

        /* Chrome adds different candidates even using bundle, so we concat the candidates list */
        if (typeof bLine.candidates != 'undefined') {
            if (typeof candidates != 'undefined') {
                candidates = candidates.concat(bLine.candidates);
            } else {
                candidates = bLine.candidates;
            }
        }

        if ((typeof iceUfrag != 'undefined') && (typeof bLine.iceUfrag != 'undefined') && (iceUfrag != bLine.iceUfrag)) {
            throw new Error("Only BUNDLE supported, iceUfrag must be the same for all m-lines.\n" +
                            "\tLast iceUfrag: " + iceUfrag + "\n" +
                            "\tNew iceUfrag: " + bLine.iceUfrag
            );
        }

        if (typeof bLine.iceUfrag != 'undefined') {
                iceUfrag = bLine.iceUfrag;
        }

        if ((typeof icePwd != 'undefined') && (typeof bLine.icePwd != 'undefined') && (icePwd != bLine.icePwd)) {
            throw new Error("Only BUNDLE supported, icePwd must be the same for all m-lines.\n" +
                            "\tLast icePwd: " + icePwd + "\n" +
                            "\tNew icePwd: " + bLine.icePwd
            );
        }

        if (typeof bLine.icePwd != 'undefined') {
                icePwd = bLine.icePwd;
        }

        if ((typeof fingerprint != 'undefined') && (typeof bLine.fingerprint != 'undefined') &&
            (fingerprint.type != bLine.fingerprint.type || fingerprint.hash != bLine.fingerprint.hash)) {
            throw new Error("Only BUNDLE supported, fingerprint must be the same for all m-lines.\n" +
                            "\tLast fingerprint: " + JSON.stringify(fingerprint) + "\n" +
                            "\tNew fingerprint: " + JSON.stringify(bLine.fingerprint)
            );
        }

        if (typeof bLine.fingerprint != 'undefined') {
                fingerprint = bLine.fingerprint;
        }

        payloads[bLine.type] = bLine.payloads;
        rtcpFb[bLine.type] = bLine.rtcpFb;
        rtp[bLine.type] = bLine.rtp;

        // inverted ssrc group map
        var ssrc2group = {};
        if (typeof ssrcGroups !== 'undefined' && Array.isArray(ssrcGroups)) {
            ssrcGroups.forEach(function (ssrcGroup) {
                // XXX This might brake if an SSRC is in more than one group
                // for some reason.
                if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                    Array.isArray(ssrcGroup.ssrcs)) {
                    ssrcGroup.ssrcs.forEach(function (ssrc) {
                        if (typeof ssrc2group[ssrc] === 'undefined') {
                            ssrc2group[ssrc] = [];
                        }

                        ssrc2group[ssrc].push(ssrcGroup);
                    });
                }
            });
        }

        // ssrc to m-line index.
        var ssrc2ml = {};

        if (typeof sources === 'object') {

            // We'll use the "bLine" object as a prototype for each new "mLine"
            // that we create, but first we need to clean it up a bit.
            delete bLine.sources;
            delete bLine.ssrcGroups;
            delete bLine.candidates;
            delete bLine.iceUfrag;
            delete bLine.icePwd;
            delete bLine.fingerprint;
            delete bLine.port;
            delete bLine.mid;

            // Explode the Plan B channel sources with one m-line per source.
            Object.keys(sources).forEach(function(ssrc) {

                // The (unified) m-line for this SSRC. We either create it from
                // scratch or, if it's a grouped SSRC, we re-use a related
                // mline. In other words, if the source is grouped with another
                // source, put the two together in the same m-line.
                var uLine;

                // We assume here that we are the answerer in the O/A, so any
                // offers which we translate come from the remote side, while
                // answers are local. So the check below is to make that we
                // handle receive-only SSRCs in a special way only if they come
                // from the remote side.
                if (desc.type==='offer') {
                    // We want to detect SSRCs which are used by a remote peer
                    // in an m-line with direction=recvonly (i.e. they are
                    // being used for RTCP only).
                    // This information would have gotten lost if the remote
                    // peer used Unified Plan and their local description was
                    // translated to Plan B. So we use the lack of an MSID
                    // attribute to deduce a "receive only" SSRC.
                    if (!sources[ssrc].msid) {
                        recvonlySsrcs[bLine.type][ssrc] = sources[ssrc];
                        // Receive-only SSRCs must not create new m-lines. We
                        // will assign them to an existing m-line later.
                        return;
                    }
                }

                if (typeof ssrc2group[ssrc] !== 'undefined' &&
                    Array.isArray(ssrc2group[ssrc])) {
                    ssrc2group[ssrc].some(function (ssrcGroup) {
                        // ssrcGroup.ssrcs *is* an Array, no need to check
                        // again here.
                        return ssrcGroup.ssrcs.some(function (related) {
                            if (typeof ssrc2ml[related] === 'object') {
                                uLine = ssrc2ml[related];
                                return true;
                            }
                        });
                    });
                }

                if (typeof uLine === 'object') {
                    // the m-line already exists. Just add the source.
                    uLine.sources[ssrc] = sources[ssrc];
                    delete sources[ssrc].msid;
                } else {
                    // Use the "bLine" as a prototype for the "uLine".
                    uLine = Object.create(bLine);
                    ssrc2ml[ssrc] = uLine;

                    if (typeof sources[ssrc].msid !== 'undefined') {
                        // Assign the msid of the source to the m-line. Note
                        // that it is not guaranteed that the source will have
                        // msid. In particular "recvonly" sources don't have an
                        // msid. Note that "recvonly" is a term only defined
                        // for m-lines.
                        uLine.msid = sources[ssrc].msid;
                        delete sources[ssrc].msid;
                    }

                    // We assign one SSRC per media line.
                    uLine.sources = {};
                    uLine.sources[ssrc] = sources[ssrc];
                    uLine.ssrcGroups = ssrc2group[ssrc];

                    // Use the cached Unified Plan SDP (if it exists) to assign
                    // SSRCs to mids.
                    if (typeof cached !== 'undefined' &&
                        typeof cached.media !== 'undefined' &&
                        Array.isArray(cached.media)) {

                        cached.media.forEach(function (m) {
                            if (typeof m.sources === 'object') {
                                Object.keys(m.sources).forEach(function (s) {
                                    if (s === ssrc) {
                                        uLine.mid = m.mid;
                                    }
                                });
                            }
                        });
                    }

                    if (typeof uLine.mid === 'undefined') {

                        // If this is an SSRC that we see for the first time
                        // assign it a new mid. This is typically the case when
                        // this method is called to transform a remote
                        // description for the first time or when there is a
                        // new SSRC in the remote description because a new
                        // peer has joined the conference. Local SSRCs should
                        // have already been added to the map in the toPlanB
                        // method.
                        //
                        // Because FF generates answers in Unified Plan style,
                        // we MUST already have a cached answer with all the
                        // local SSRCs mapped to some m-line/mid.

                        uLine.mid = [bLine.type, '-', ssrc].join('');
                    }

                    // Include the candidates in the 1st media line.
                    uLine.candidates = candidates;
                    uLine.iceUfrag = iceUfrag;
                    uLine.icePwd = icePwd;
                    uLine.fingerprint = fingerprint;
                    uLine.port = port;

                    mid2ul[uLine.mid] = uLine;
                    sources2ul[uIdx] = uLine.sources;

                    self.cache.mlU2BMap[uIdx] = bIdx;
                    if (typeof self.cache.mlB2UMap[bIdx] === 'undefined') {
                      self.cache.mlB2UMap[bIdx] = uIdx;
                    }
                    uIdx++;
                }
            });
        } else {
          var uLine = bLine;

          uLine.candidates = candidates;
          uLine.iceUfrag = iceUfrag;
          uLine.icePwd = icePwd;
          uLine.fingerprint = fingerprint;
          uLine.port = port;

          mid2ul[uLine.mid] = uLine;

          self.cache.mlU2BMap[uIdx] = bIdx;
          if (typeof self.cache.mlB2UMap[bIdx] === 'undefined') {
            self.cache.mlB2UMap[bIdx] = uIdx;
          }
        }

        bIdx++;
    });

    // Rebuild the media array in the right order and add the missing mLines
    // (missing from the Plan B SDP).
    session.media = [];
    mids = []; // reuse

    if (desc.type === 'answer') {

        // The media lines in the answer must match the media lines in the
        // offer. The order is important too. Here we assume that Firefox is
        // the answerer, so we merely have to use the reconstructed (unified)
        // answer to update the cached (unified) answer accordingly.
        //
        // In the general case, one would have to use the cached (unified)
        // offer to find the m-lines that are missing from the reconstructed
        // answer, potentially grabbing them from the cached (unified) answer.
        // One has to be careful with this approach because inactive m-lines do
        // not always have an mid, making it tricky (impossible?) to find where
        // exactly and which m-lines are missing from the reconstructed answer.

        for (var i = 0; i < cached.media.length; i++) {
            var uLine = cached.media[i];

            delete uLine.msid;
            delete uLine.sources;
            delete uLine.ssrcGroups;

            if (typeof sources2ul[i] === 'undefined') {
              if (!uLine.direction
                  || uLine.direction === 'sendrecv')
                  uLine.direction = 'recvonly';
              else if (uLine.direction === 'sendonly')
                  uLine.direction = 'inactive';
            } else {
              if (!uLine.direction
                  || uLine.direction === 'sendrecv')
                  uLine.direction = 'sendrecv';
              else if (uLine.direction === 'recvonly')
                  uLine.direction = 'sendonly';
            }

            uLine.sources = sources2ul[i];
            uLine.candidates = candidates;
            uLine.iceUfrag = iceUfrag;
            uLine.icePwd = icePwd;
            uLine.fingerprint = fingerprint;

            uLine.rtp = rtp[uLine.type];
            uLine.payloads = payloads[uLine.type];
            uLine.rtcpFb = rtcpFb[uLine.type];

            session.media.push(uLine);

            if (typeof uLine.mid === 'string') {
                // inactive lines don't/may not have an mid.
                mids.push(uLine.mid);
            }
        }
    } else {

        // SDP offer/answer (and the JSEP spec) forbids removing an m-section
        // under any circumstances. If we are no longer interested in sending a
        // track, we just remove the msid and ssrc attributes and set it to
        // either a=recvonly (as the reofferer, we must use recvonly if the
        // other side was previously sending on the m-section, but we can also
        // leave the possibility open if it wasn't previously in use), or
        // a=inactive.

        if (typeof cached !== 'undefined' &&
            typeof cached.media !== 'undefined' &&
            Array.isArray(cached.media)) {
            cached.media.forEach(function(uLine) {
                mids.push(uLine.mid);
                if (typeof mid2ul[uLine.mid] !== 'undefined') {
                    session.media.push(mid2ul[uLine.mid]);
                } else {
                    delete uLine.msid;
                    delete uLine.sources;
                    delete uLine.ssrcGroups;

                    if (!uLine.direction
                        || uLine.direction === 'sendrecv') {
                        uLine.direction = 'sendonly';
                    }
                    if (!uLine.direction
                        || uLine.direction === 'recvonly') {
                        uLine.direction = 'inactive';
                    }

                    addSetupAttr (uLine);
                    session.media.push(uLine);
                }
            });
        }

        // Add all the remaining (new) m-lines of the transformed SDP.
        Object.keys(mid2ul).forEach(function(mid) {
            if (mids.indexOf(mid) === -1) {
                mids.push(mid);
                if (mid2ul[mid].direction === 'recvonly') {
                    // This is a remote recvonly channel. Add its SSRC to the
                    // appropriate sendrecv or sendonly channel.
                    // TODO(gp) what if we don't have sendrecv/sendonly
                    // channel?

                    var done = false;

                    session.media.some(function (uLine) {
                        if ((uLine.direction === 'sendrecv' ||
                            uLine.direction === 'sendonly') &&
                            uLine.type === mid2ul[mid].type) {
                            // mid2ul[mid] shouldn't have any ssrc-groups
                            Object.keys(mid2ul[mid].sources).forEach(
                                function (ssrc) {
                                uLine.sources[ssrc] =
                                    mid2ul[mid].sources[ssrc];
                            });

                            done = true;
                            return true;
                        }
                    });

                    if (!done) {
                        session.media.push(mid2ul[mid]);
                    }
                } else {
                    session.media.push(mid2ul[mid]);
                }
            }
        });
    }

    // After we have constructed the Plan Unified m-lines we can figure out
    // where (in which m-line) to place the 'recvonly SSRCs'.
    // Note: we assume here that we are the answerer in the O/A, so any offers
    // which we translate come from the remote side, while answers are local
    // (and so our last local description is cached as an 'answer').
    ["audio", "video"].forEach(function (type) {
        if (!session || !session.media || !Array.isArray(session.media))
            return;

        var idx = null;
        if (Object.keys(recvonlySsrcs[type]).length > 0) {
            idx = self.getFirstSendingIndexFromAnswer(type);
            if (idx === null){
                // If this is the first offer we receive, we don't have a
                // cached answer. Assume that we will be sending media using
                // the first m-line for each media type.

                for (var i = 0; i < session.media.length; i++) {
                    if (session.media[i].type === type) {
                        idx = i;
                        break;
                    }
                }
            }
        }

        if (idx && session.media.length > idx) {
            var mLine = session.media[idx];
            Object.keys(recvonlySsrcs[type]).forEach(function(ssrc) {
                if (mLine.sources && mLine.sources[ssrc]) {
                    console.warn("Replacing an existing SSRC.");
                }
                if (!mLine.sources) {
                    mLine.sources = {};
                }

                mLine.sources[ssrc] = recvonlySsrcs[type][ssrc];
            });
        }
    });

    if (typeof session.groups !== 'undefined') {
      // We regenerate the BUNDLE group (since we regenerated the mids)
      session.groups.some(function(group) {
	  if (group.type === 'BUNDLE') {
	      group.mids = mids.join(' ');
	      return true;
	  }
      });
    }

    // msid semantic
    session.msidSemantic = {
        semantic: 'WMS',
        token: '*'
    };

    var resStr = transform.write(session);

    // Cache the transformed SDP (Unified Plan) for later re-use in this
    // function.
    this.cache[desc.type] = resStr;

    return new RTCSessionDescription({
        type: desc.type,
        sdp: resStr
    });

    //#endregion
};

},{"./array-equals":14,"./transform":17}],17:[function(require,module,exports){
/* Copyright @ 2015 Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var transform = require('sdp-transform');

exports.write = function(session, opts) {

  if (typeof session !== 'undefined' &&
      typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // expand sources to ssrcs
      if (typeof mLine.sources !== 'undefined' &&
        Object.keys(mLine.sources).length !== 0) {
          mLine.ssrcs = [];
          Object.keys(mLine.sources).forEach(function (ssrc) {
            var source = mLine.sources[ssrc];
            Object.keys(source).forEach(function (attribute) {
              mLine.ssrcs.push({
                id: ssrc,
                attribute: attribute,
                value: source[attribute]
              });
            });
          });
          delete mLine.sources;
        }

      // join ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs !== 'undefined' &&
                Array.isArray(ssrcGroup.ssrcs)) {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.join(' ');
            }
          });
        }
    });
  }

  // join group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids !== 'undefined' && Array.isArray(g.mids)) {
        g.mids = g.mids.join(' ');
      }
    });
  }

  return transform.write(session, opts);
};

exports.parse = function(sdp) {
  var session = transform.parse(sdp);

  if (typeof session !== 'undefined' && typeof session.media !== 'undefined' &&
      Array.isArray(session.media)) {

    session.media.forEach(function (mLine) {
      // group sources attributes by ssrc
      if (typeof mLine.ssrcs !== 'undefined' && Array.isArray(mLine.ssrcs)) {
        mLine.sources = {};
        mLine.ssrcs.forEach(function (ssrc) {
          if (!mLine.sources[ssrc.id])
          mLine.sources[ssrc.id] = {};
        mLine.sources[ssrc.id][ssrc.attribute] = ssrc.value;
        });

        delete mLine.ssrcs;
      }

      // split ssrcs in ssrc groups
      if (typeof mLine.ssrcGroups !== 'undefined' &&
        Array.isArray(mLine.ssrcGroups)) {
          mLine.ssrcGroups.forEach(function (ssrcGroup) {
            if (typeof ssrcGroup.ssrcs === 'string') {
              ssrcGroup.ssrcs = ssrcGroup.ssrcs.split(' ');
            }
          });
        }
    });
  }
  // split group mids
  if (typeof session !== 'undefined' &&
      typeof session.groups !== 'undefined' && Array.isArray(session.groups)) {

    session.groups.forEach(function (g) {
      if (typeof g.mids === 'string') {
        g.mids = g.mids.split(' ');
      }
    });
  }

  return session;
};


},{"sdp-transform":11}],18:[function(require,module,exports){
/**
 * UAParser.js v0.7.17
 * Lightweight JavaScript-based User-Agent string parser
 * https://github.com/faisalman/ua-parser-js
 *
 * Copyright © 2012-2016 Faisal Salman <fyzlman@gmail.com>
 * Dual licensed under GPLv2 & MIT
 */

(function (window, undefined) {

    'use strict';

    //////////////
    // Constants
    /////////////


    var LIBVERSION  = '0.7.17',
        EMPTY       = '',
        UNKNOWN     = '?',
        FUNC_TYPE   = 'function',
        UNDEF_TYPE  = 'undefined',
        OBJ_TYPE    = 'object',
        STR_TYPE    = 'string',
        MAJOR       = 'major', // deprecated
        MODEL       = 'model',
        NAME        = 'name',
        TYPE        = 'type',
        VENDOR      = 'vendor',
        VERSION     = 'version',
        ARCHITECTURE= 'architecture',
        CONSOLE     = 'console',
        MOBILE      = 'mobile',
        TABLET      = 'tablet',
        SMARTTV     = 'smarttv',
        WEARABLE    = 'wearable',
        EMBEDDED    = 'embedded';


    ///////////
    // Helper
    //////////


    var util = {
        extend : function (regexes, extensions) {
            var margedRegexes = {};
            for (var i in regexes) {
                if (extensions[i] && extensions[i].length % 2 === 0) {
                    margedRegexes[i] = extensions[i].concat(regexes[i]);
                } else {
                    margedRegexes[i] = regexes[i];
                }
            }
            return margedRegexes;
        },
        has : function (str1, str2) {
          if (typeof str1 === "string") {
            return str2.toLowerCase().indexOf(str1.toLowerCase()) !== -1;
          } else {
            return false;
          }
        },
        lowerize : function (str) {
            return str.toLowerCase();
        },
        major : function (version) {
            return typeof(version) === STR_TYPE ? version.replace(/[^\d\.]/g,'').split(".")[0] : undefined;
        },
        trim : function (str) {
          return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
        }
    };


    ///////////////
    // Map helper
    //////////////


    var mapper = {

        rgx : function (ua, arrays) {

            //var result = {},
            var i = 0, j, k, p, q, matches, match;//, args = arguments;

            /*// construct object barebones
            for (p = 0; p < args[1].length; p++) {
                q = args[1][p];
                result[typeof q === OBJ_TYPE ? q[0] : q] = undefined;
            }*/

            // loop through all regexes maps
            while (i < arrays.length && !matches) {

                var regex = arrays[i],       // even sequence (0,2,4,..)
                    props = arrays[i + 1];   // odd sequence (1,3,5,..)
                j = k = 0;

                // try matching uastring with regexes
                while (j < regex.length && !matches) {

                    matches = regex[j++].exec(ua);

                    if (!!matches) {
                        for (p = 0; p < props.length; p++) {
                            match = matches[++k];
                            q = props[p];
                            // check if given property is actually array
                            if (typeof q === OBJ_TYPE && q.length > 0) {
                                if (q.length == 2) {
                                    if (typeof q[1] == FUNC_TYPE) {
                                        // assign modified match
                                        this[q[0]] = q[1].call(this, match);
                                    } else {
                                        // assign given value, ignore regex match
                                        this[q[0]] = q[1];
                                    }
                                } else if (q.length == 3) {
                                    // check whether function or regex
                                    if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                                        // call function (usually string mapper)
                                        this[q[0]] = match ? q[1].call(this, match, q[2]) : undefined;
                                    } else {
                                        // sanitize match using given regex
                                        this[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                                    }
                                } else if (q.length == 4) {
                                        this[q[0]] = match ? q[3].call(this, match.replace(q[1], q[2])) : undefined;
                                }
                            } else {
                                this[q] = match ? match : undefined;
                            }
                        }
                    }
                }
                i += 2;
            }
            // console.log(this);
            //return this;
        },

        str : function (str, map) {

            for (var i in map) {
                // check if array
                if (typeof map[i] === OBJ_TYPE && map[i].length > 0) {
                    for (var j = 0; j < map[i].length; j++) {
                        if (util.has(map[i][j], str)) {
                            return (i === UNKNOWN) ? undefined : i;
                        }
                    }
                } else if (util.has(map[i], str)) {
                    return (i === UNKNOWN) ? undefined : i;
                }
            }
            return str;
        }
    };


    ///////////////
    // String map
    //////////////


    var maps = {

        browser : {
            oldsafari : {
                version : {
                    '1.0'   : '/8',
                    '1.2'   : '/1',
                    '1.3'   : '/3',
                    '2.0'   : '/412',
                    '2.0.2' : '/416',
                    '2.0.3' : '/417',
                    '2.0.4' : '/419',
                    '?'     : '/'
                }
            }
        },

        device : {
            amazon : {
                model : {
                    'Fire Phone' : ['SD', 'KF']
                }
            },
            sprint : {
                model : {
                    'Evo Shift 4G' : '7373KT'
                },
                vendor : {
                    'HTC'       : 'APA',
                    'Sprint'    : 'Sprint'
                }
            }
        },

        os : {
            windows : {
                version : {
                    'ME'        : '4.90',
                    'NT 3.11'   : 'NT3.51',
                    'NT 4.0'    : 'NT4.0',
                    '2000'      : 'NT 5.0',
                    'XP'        : ['NT 5.1', 'NT 5.2'],
                    'Vista'     : 'NT 6.0',
                    '7'         : 'NT 6.1',
                    '8'         : 'NT 6.2',
                    '8.1'       : 'NT 6.3',
                    '10'        : ['NT 6.4', 'NT 10.0'],
                    'RT'        : 'ARM'
                }
            }
        }
    };


    //////////////
    // Regex map
    /////////////


    var regexes = {

        browser : [[

            // Presto based
            /(opera\smini)\/([\w\.-]+)/i,                                       // Opera Mini
            /(opera\s[mobiletab]+).+version\/([\w\.-]+)/i,                      // Opera Mobi/Tablet
            /(opera).+version\/([\w\.]+)/i,                                     // Opera > 9.80
            /(opera)[\/\s]+([\w\.]+)/i                                          // Opera < 9.80
            ], [NAME, VERSION], [

            /(opios)[\/\s]+([\w\.]+)/i                                          // Opera mini on iphone >= 8.0
            ], [[NAME, 'Opera Mini'], VERSION], [

            /\s(opr)\/([\w\.]+)/i                                               // Opera Webkit
            ], [[NAME, 'Opera'], VERSION], [

            // Mixed
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?([\w\.]+)*/i,
                                                                                // Lunascape/Maxthon/Netfront/Jasmine/Blazer

            // Trident based
            /(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?([\w\.]*)/i,
                                                                                // Avant/IEMobile/SlimBrowser/Baidu
            /(?:ms|\()(ie)\s([\w\.]+)/i,                                        // Internet Explorer

            // Webkit/KHTML based
            /(rekonq)\/([\w\.]+)*/i,                                            // Rekonq
            /(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron|vivaldi|iridium|phantomjs|bowser)\/([\w\.-]+)/i
                                                                                // Chromium/Flock/RockMelt/Midori/Epiphany/Silk/Skyfire/Bolt/Iron/Iridium/PhantomJS/Bowser
            ], [NAME, VERSION], [

            /(trident).+rv[:\s]([\w\.]+).+like\sgecko/i                         // IE11
            ], [[NAME, 'IE'], VERSION], [

            /(edge)\/((\d+)?[\w\.]+)/i                                          // Microsoft Edge
            ], [NAME, VERSION], [

            /(yabrowser)\/([\w\.]+)/i                                           // Yandex
            ], [[NAME, 'Yandex'], VERSION], [

            /(puffin)\/([\w\.]+)/i                                              // Puffin
            ], [[NAME, 'Puffin'], VERSION], [

            /((?:[\s\/])uc?\s?browser|(?:juc.+)ucweb)[\/\s]?([\w\.]+)/i
                                                                                // UCBrowser
            ], [[NAME, 'UCBrowser'], VERSION], [

            /(comodo_dragon)\/([\w\.]+)/i                                       // Comodo Dragon
            ], [[NAME, /_/g, ' '], VERSION], [

            /(micromessenger)\/([\w\.]+)/i                                      // WeChat
            ], [[NAME, 'WeChat'], VERSION], [

            /(QQ)\/([\d\.]+)/i                                                  // QQ, aka ShouQ
            ], [NAME, VERSION], [

            /m?(qqbrowser)[\/\s]?([\w\.]+)/i                                    // QQBrowser
            ], [NAME, VERSION], [

            /xiaomi\/miuibrowser\/([\w\.]+)/i                                   // MIUI Browser
            ], [VERSION, [NAME, 'MIUI Browser']], [

            /;fbav\/([\w\.]+);/i                                                // Facebook App for iOS & Android
            ], [VERSION, [NAME, 'Facebook']], [

            /headlesschrome(?:\/([\w\.]+)|\s)/i                                 // Chrome Headless
            ], [VERSION, [NAME, 'Chrome Headless']], [

            /\swv\).+(chrome)\/([\w\.]+)/i                                      // Chrome WebView
            ], [[NAME, /(.+)/, '$1 WebView'], VERSION], [

            /((?:oculus|samsung)browser)\/([\w\.]+)/i
            ], [[NAME, /(.+(?:g|us))(.+)/, '$1 $2'], VERSION], [                // Oculus / Samsung Browser

            /android.+version\/([\w\.]+)\s+(?:mobile\s?safari|safari)*/i        // Android Browser
            ], [VERSION, [NAME, 'Android Browser']], [

            /(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?([\w\.]+)/i
                                                                                // Chrome/OmniWeb/Arora/Tizen/Nokia
            ], [NAME, VERSION], [

            /(dolfin)\/([\w\.]+)/i                                              // Dolphin
            ], [[NAME, 'Dolphin'], VERSION], [

            /((?:android.+)crmo|crios)\/([\w\.]+)/i                             // Chrome for Android/iOS
            ], [[NAME, 'Chrome'], VERSION], [

            /(coast)\/([\w\.]+)/i                                               // Opera Coast
            ], [[NAME, 'Opera Coast'], VERSION], [

            /fxios\/([\w\.-]+)/i                                                // Firefox for iOS
            ], [VERSION, [NAME, 'Firefox']], [

            /version\/([\w\.]+).+?mobile\/\w+\s(safari)/i                       // Mobile Safari
            ], [VERSION, [NAME, 'Mobile Safari']], [

            /version\/([\w\.]+).+?(mobile\s?safari|safari)/i                    // Safari & Safari Mobile
            ], [VERSION, NAME], [

            /webkit.+?(gsa)\/([\w\.]+).+?(mobile\s?safari|safari)(\/[\w\.]+)/i  // Google Search Appliance on iOS
            ], [[NAME, 'GSA'], VERSION], [

            /webkit.+?(mobile\s?safari|safari)(\/[\w\.]+)/i                     // Safari < 3.0
            ], [NAME, [VERSION, mapper.str, maps.browser.oldsafari.version]], [

            /(konqueror)\/([\w\.]+)/i,                                          // Konqueror
            /(webkit|khtml)\/([\w\.]+)/i
            ], [NAME, VERSION], [

            // Gecko based
            /(navigator|netscape)\/([\w\.-]+)/i                                 // Netscape
            ], [[NAME, 'Netscape'], VERSION], [
            /(swiftfox)/i,                                                      // Swiftfox
            /(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?([\w\.\+]+)/i,
                                                                                // IceDragon/Iceweasel/Camino/Chimera/Fennec/Maemo/Minimo/Conkeror
            /(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/([\w\.-]+)/i,
                                                                                // Firefox/SeaMonkey/K-Meleon/IceCat/IceApe/Firebird/Phoenix
            /(mozilla)\/([\w\.]+).+rv\:.+gecko\/\d+/i,                          // Mozilla

            // Other
            /(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf|sleipnir)[\/\s]?([\w\.]+)/i,
                                                                                // Polaris/Lynx/Dillo/iCab/Doris/Amaya/w3m/NetSurf/Sleipnir
            /(links)\s\(([\w\.]+)/i,                                            // Links
            /(gobrowser)\/?([\w\.]+)*/i,                                        // GoBrowser
            /(ice\s?browser)\/v?([\w\._]+)/i,                                   // ICE Browser
            /(mosaic)[\/\s]([\w\.]+)/i                                          // Mosaic
            ], [NAME, VERSION]

            /* /////////////////////
            // Media players BEGIN
            ////////////////////////

            , [

            /(apple(?:coremedia|))\/((\d+)[\w\._]+)/i,                          // Generic Apple CoreMedia
            /(coremedia) v((\d+)[\w\._]+)/i
            ], [NAME, VERSION], [

            /(aqualung|lyssna|bsplayer)\/((\d+)?[\w\.-]+)/i                     // Aqualung/Lyssna/BSPlayer
            ], [NAME, VERSION], [

            /(ares|ossproxy)\s((\d+)[\w\.-]+)/i                                 // Ares/OSSProxy
            ], [NAME, VERSION], [

            /(audacious|audimusicstream|amarok|bass|core|dalvik|gnomemplayer|music on console|nsplayer|psp-internetradioplayer|videos)\/((\d+)[\w\.-]+)/i,
                                                                                // Audacious/AudiMusicStream/Amarok/BASS/OpenCORE/Dalvik/GnomeMplayer/MoC
                                                                                // NSPlayer/PSP-InternetRadioPlayer/Videos
            /(clementine|music player daemon)\s((\d+)[\w\.-]+)/i,               // Clementine/MPD
            /(lg player|nexplayer)\s((\d+)[\d\.]+)/i,
            /player\/(nexplayer|lg player)\s((\d+)[\w\.-]+)/i                   // NexPlayer/LG Player
            ], [NAME, VERSION], [
            /(nexplayer)\s((\d+)[\w\.-]+)/i                                     // Nexplayer
            ], [NAME, VERSION], [

            /(flrp)\/((\d+)[\w\.-]+)/i                                          // Flip Player
            ], [[NAME, 'Flip Player'], VERSION], [

            /(fstream|nativehost|queryseekspider|ia-archiver|facebookexternalhit)/i
                                                                                // FStream/NativeHost/QuerySeekSpider/IA Archiver/facebookexternalhit
            ], [NAME], [

            /(gstreamer) souphttpsrc (?:\([^\)]+\)){0,1} libsoup\/((\d+)[\w\.-]+)/i
                                                                                // Gstreamer
            ], [NAME, VERSION], [

            /(htc streaming player)\s[\w_]+\s\/\s((\d+)[\d\.]+)/i,              // HTC Streaming Player
            /(java|python-urllib|python-requests|wget|libcurl)\/((\d+)[\w\.-_]+)/i,
                                                                                // Java/urllib/requests/wget/cURL
            /(lavf)((\d+)[\d\.]+)/i                                             // Lavf (FFMPEG)
            ], [NAME, VERSION], [

            /(htc_one_s)\/((\d+)[\d\.]+)/i                                      // HTC One S
            ], [[NAME, /_/g, ' '], VERSION], [

            /(mplayer)(?:\s|\/)(?:(?:sherpya-){0,1}svn)(?:-|\s)(r\d+(?:-\d+[\w\.-]+){0,1})/i
                                                                                // MPlayer SVN
            ], [NAME, VERSION], [

            /(mplayer)(?:\s|\/|[unkow-]+)((\d+)[\w\.-]+)/i                      // MPlayer
            ], [NAME, VERSION], [

            /(mplayer)/i,                                                       // MPlayer (no other info)
            /(yourmuze)/i,                                                      // YourMuze
            /(media player classic|nero showtime)/i                             // Media Player Classic/Nero ShowTime
            ], [NAME], [

            /(nero (?:home|scout))\/((\d+)[\w\.-]+)/i                           // Nero Home/Nero Scout
            ], [NAME, VERSION], [

            /(nokia\d+)\/((\d+)[\w\.-]+)/i                                      // Nokia
            ], [NAME, VERSION], [

            /\s(songbird)\/((\d+)[\w\.-]+)/i                                    // Songbird/Philips-Songbird
            ], [NAME, VERSION], [

            /(winamp)3 version ((\d+)[\w\.-]+)/i,                               // Winamp
            /(winamp)\s((\d+)[\w\.-]+)/i,
            /(winamp)mpeg\/((\d+)[\w\.-]+)/i
            ], [NAME, VERSION], [

            /(ocms-bot|tapinradio|tunein radio|unknown|winamp|inlight radio)/i  // OCMS-bot/tap in radio/tunein/unknown/winamp (no other info)
                                                                                // inlight radio
            ], [NAME], [

            /(quicktime|rma|radioapp|radioclientapplication|soundtap|totem|stagefright|streamium)\/((\d+)[\w\.-]+)/i
                                                                                // QuickTime/RealMedia/RadioApp/RadioClientApplication/
                                                                                // SoundTap/Totem/Stagefright/Streamium
            ], [NAME, VERSION], [

            /(smp)((\d+)[\d\.]+)/i                                              // SMP
            ], [NAME, VERSION], [

            /(vlc) media player - version ((\d+)[\w\.]+)/i,                     // VLC Videolan
            /(vlc)\/((\d+)[\w\.-]+)/i,
            /(xbmc|gvfs|xine|xmms|irapp)\/((\d+)[\w\.-]+)/i,                    // XBMC/gvfs/Xine/XMMS/irapp
            /(foobar2000)\/((\d+)[\d\.]+)/i,                                    // Foobar2000
            /(itunes)\/((\d+)[\d\.]+)/i                                         // iTunes
            ], [NAME, VERSION], [

            /(wmplayer)\/((\d+)[\w\.-]+)/i,                                     // Windows Media Player
            /(windows-media-player)\/((\d+)[\w\.-]+)/i
            ], [[NAME, /-/g, ' '], VERSION], [

            /windows\/((\d+)[\w\.-]+) upnp\/[\d\.]+ dlnadoc\/[\d\.]+ (home media server)/i
                                                                                // Windows Media Server
            ], [VERSION, [NAME, 'Windows']], [

            /(com\.riseupradioalarm)\/((\d+)[\d\.]*)/i                          // RiseUP Radio Alarm
            ], [NAME, VERSION], [

            /(rad.io)\s((\d+)[\d\.]+)/i,                                        // Rad.io
            /(radio.(?:de|at|fr))\s((\d+)[\d\.]+)/i
            ], [[NAME, 'rad.io'], VERSION]

            //////////////////////
            // Media players END
            ////////////////////*/

        ],

        cpu : [[

            /(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i                     // AMD64
            ], [[ARCHITECTURE, 'amd64']], [

            /(ia32(?=;))/i                                                      // IA32 (quicktime)
            ], [[ARCHITECTURE, util.lowerize]], [

            /((?:i[346]|x)86)[;\)]/i                                            // IA32
            ], [[ARCHITECTURE, 'ia32']], [

            // PocketPC mistakenly identified as PowerPC
            /windows\s(ce|mobile);\sppc;/i
            ], [[ARCHITECTURE, 'arm']], [

            /((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i                           // PowerPC
            ], [[ARCHITECTURE, /ower/, '', util.lowerize]], [

            /(sun4\w)[;\)]/i                                                    // SPARC
            ], [[ARCHITECTURE, 'sparc']], [

            /((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i
                                                                                // IA64, 68K, ARM/64, AVR/32, IRIX/64, MIPS/64, SPARC/64, PA-RISC
            ], [[ARCHITECTURE, util.lowerize]]
        ],

        device : [[

            /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
            ], [MODEL, VENDOR, [TYPE, TABLET]], [

            /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]], [

            /(apple\s{0,1}tv)/i                                                 // Apple TV
            ], [[MODEL, 'Apple TV'], [VENDOR, 'Apple']], [

            /(archos)\s(gamepad2?)/i,                                           // Archos
            /(hp).+(touchpad)/i,                                                // HP TouchPad
            /(hp).+(tablet)/i,                                                  // HP Tablet
            /(kindle)\/([\w\.]+)/i,                                             // Kindle
            /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
            /(dell)\s(strea[kpr\s\d]*[\dko])/i                                  // Dell Streak
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [
            /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
            ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], [

            /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
            ], [MODEL, VENDOR, [TYPE, MOBILE]], [
            /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
            ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [

            /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
            /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
                                                                                // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Meizu/Motorola/Polytron
            /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
            /(asus)-?(\w+)/i                                                    // Asus
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
            ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
                                                                                // Asus Tablets
            /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
            ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]], [

            /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
            /(sony)?(?:sgp.+)\sbuild\//i
            ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
            /android.+\s([c-g]\d{4}|so[-l]\w+)\sbuild\//i
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /\s(ouya)\s/i,                                                      // Ouya
            /(nintendo)\s([wids3u]+)/i                                          // Nintendo
            ], [VENDOR, MODEL, [TYPE, CONSOLE]], [

            /android.+;\s(shield)\sbuild/i                                      // Nvidia
            ], [MODEL, [VENDOR, 'Nvidia'], [TYPE, CONSOLE]], [

            /(playstation\s[34portablevi]+)/i                                   // Playstation
            ], [MODEL, [VENDOR, 'Sony'], [TYPE, CONSOLE]], [

            /(sprint\s(\w+))/i                                                  // Sprint Phones
            ], [[VENDOR, mapper.str, maps.device.sprint.vendor], [MODEL, mapper.str, maps.device.sprint.model], [TYPE, MOBILE]], [

            /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
            /(zte)-(\w+)*/i,                                                    // ZTE
            /(alcatel|geeksphone|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
                                                                                // Alcatel/GeeksPhone/Lenovo/Nexian/Panasonic/Sony
            ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [

            /(nexus\s9)/i                                                       // HTC Nexus 9
            ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [

            /d\/huawei([\w\s-]+)[;\)]/i,
            /(nexus\s6p)/i                                                      // Huawei
            ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]], [

            /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /[\s\(;](xbox(?:\sone)?)[\s\);]/i                                   // Microsoft Xbox
            ], [MODEL, [VENDOR, 'Microsoft'], [TYPE, CONSOLE]], [
            /(kin\.[onetw]{3})/i                                                // Microsoft Kin
            ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]], [

                                                                                // Motorola
            /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
            /mot[\s-]?(\w+)*/i,
            /(XT\d{3,4}) build\//i,
            /(nexus\s6)/i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
            /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
            ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]], [

            /hbbtv\/\d+\.\d+\.\d+\s+\([\w\s]*;\s*(\w[^;]*);([^;]*)/i            // HbbTV devices
            ], [[VENDOR, util.trim], [MODEL, util.trim], [TYPE, SMARTTV]], [

            /hbbtv.+maple;(\d+)/i
            ], [[MODEL, /^/, 'SmartTV'], [VENDOR, 'Samsung'], [TYPE, SMARTTV]], [

            /\(dtv[\);].+(aquos)/i                                              // Sharp
            ], [MODEL, [VENDOR, 'Sharp'], [TYPE, SMARTTV]], [

            /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
            /((SM-T\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
            /smart-tv.+(samsung)/i
            ], [VENDOR, [TYPE, SMARTTV], MODEL], [
            /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
            /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
            /sec-((sgh\w+))/i
            ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [

            /sie-(\w+)*/i                                                       // Siemens
            ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [

            /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
            /(nokia)[\s_-]?([\w-]+)*/i
            ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [

            /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
            ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [

            /android.+([vl]k\-?\d{3})\s+build/i                                 // LG Tablet
            ], [MODEL, [VENDOR, 'LG'], [TYPE, TABLET]], [
            /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
            ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]], [
            /(lg) netcast\.tv/i                                                 // LG SmartTV
            ], [VENDOR, MODEL, [TYPE, SMARTTV]], [
            /(nexus\s[45])/i,                                                   // LG
            /lg[e;\s\/-]+(\w+)*/i,
            /android.+lg(\-?[\d\w]+)\s+build/i
            ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [

            /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
            ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [

            /linux;.+((jolla));/i                                               // Jolla
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /((pebble))app\/[\d\.]+\s/i                                         // Pebble
            ], [VENDOR, MODEL, [TYPE, WEARABLE]], [

            /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [

            /crkey/i                                                            // Google Chromecast
            ], [[MODEL, 'Chromecast'], [VENDOR, 'Google']], [

            /android.+;\s(glass)\s\d/i                                          // Google Glass
            ], [MODEL, [VENDOR, 'Google'], [TYPE, WEARABLE]], [

            /android.+;\s(pixel c)\s/i                                          // Google Pixel C
            ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [

            /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
            ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [

            /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
            /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
            /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i,    // Xiaomi Mi
            /android.+(redmi[\s\-_]*(?:note)?(?:[\s_]*[\w\s]+)?)\s+build/i      // Redmi Phones
            ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
            /android.+(mi[\s\-_]*(?:pad)?(?:[\s_]*[\w\s]+)?)\s+build/i          // Mi Pad tablets
            ],[[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, TABLET]], [
            /android.+;\s(m[1-5]\snote)\sbuild/i                                // Meizu Tablet
            ], [MODEL, [VENDOR, 'Meizu'], [TYPE, TABLET]], [

            /android.+a000(1)\s+build/i                                         // OnePlus
            ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(RCT[\d\w]+)\s+build/i                            // RCA Tablets
            ], [MODEL, [VENDOR, 'RCA'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Venue[\d\s]*)\s+build/i                          // Dell Venue Tablets
            ], [MODEL, [VENDOR, 'Dell'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Q[T|M][\d\w]+)\s+build/i                         // Verizon Tablet
            ], [MODEL, [VENDOR, 'Verizon'], [TYPE, TABLET]], [

            /android.+[;\/]\s+(Barnes[&\s]+Noble\s+|BN[RT])(V?.*)\s+build/i     // Barnes & Noble Tablet
            ], [[VENDOR, 'Barnes & Noble'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s+(TM\d{3}.*\b)\s+build/i                           // Barnes & Noble Tablet
            ], [MODEL, [VENDOR, 'NuVision'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(zte)?.+(k\d{2})\s+build/i                        // ZTE K Series Tablet
            ], [[VENDOR, 'ZTE'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(gen\d{3})\s+build.*49h/i                         // Swiss GEN Mobile
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, MOBILE]], [

            /android.+[;\/]\s*(zur\d{3})\s+build/i                              // Swiss ZUR Tablet
            ], [MODEL, [VENDOR, 'Swiss'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((Zeki)?TB.*\b)\s+build/i                         // Zeki Tablets
            ], [MODEL, [VENDOR, 'Zeki'], [TYPE, TABLET]], [

            /(android).+[;\/]\s+([YR]\d{2}x?.*)\s+build/i,
            /android.+[;\/]\s+(Dragon[\-\s]+Touch\s+|DT)(.+)\s+build/i          // Dragon Touch Tablet
            ], [[VENDOR, 'Dragon Touch'], MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(NS-?.+)\s+build/i                                // Insignia Tablets
            ], [MODEL, [VENDOR, 'Insignia'], [TYPE, TABLET]], [

            /android.+[;\/]\s*((NX|Next)-?.+)\s+build/i                         // NextBook Tablets
            ], [MODEL, [VENDOR, 'NextBook'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Xtreme\_?)?(V(1[045]|2[015]|30|40|60|7[05]|90))\s+build/i
            ], [[VENDOR, 'Voice'], MODEL, [TYPE, MOBILE]], [                    // Voice Xtreme Phones

            /android.+[;\/]\s*(LVTEL\-?)?(V1[12])\s+build/i                     // LvTel Phones
            ], [[VENDOR, 'LvTel'], MODEL, [TYPE, MOBILE]], [

            /android.+[;\/]\s*(V(100MD|700NA|7011|917G).*\b)\s+build/i          // Envizen Tablets
            ], [MODEL, [VENDOR, 'Envizen'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Le[\s\-]+Pan)[\s\-]+(.*\b)\s+build/i             // Le Pan Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trio[\s\-]*.*)\s+build/i                         // MachSpeed Tablets
            ], [MODEL, [VENDOR, 'MachSpeed'], [TYPE, TABLET]], [

            /android.+[;\/]\s*(Trinity)[\-\s]*(T\d{3})\s+build/i                // Trinity Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /android.+[;\/]\s*TU_(1491)\s+build/i                               // Rotor Tablets
            ], [MODEL, [VENDOR, 'Rotor'], [TYPE, TABLET]], [

            /android.+(KS(.+))\s+build/i                                        // Amazon Kindle Tablets
            ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], [

            /android.+(Gigaset)[\s\-]+(Q.+)\s+build/i                           // Gigaset Tablets
            ], [VENDOR, MODEL, [TYPE, TABLET]], [

            /\s(tablet|tab)[;\/]/i,                                             // Unidentifiable Tablet
            /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
            ], [[TYPE, util.lowerize], VENDOR, MODEL], [

            /(android.+)[;\/].+build/i                                          // Generic Android Device
            ], [MODEL, [VENDOR, 'Generic']]


        /*//////////////////////////
            // TODO: move to string map
            ////////////////////////////

            /(C6603)/i                                                          // Sony Xperia Z C6603
            ], [[MODEL, 'Xperia Z C6603'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [
            /(C6903)/i                                                          // Sony Xperia Z 1
            ], [[MODEL, 'Xperia Z 1'], [VENDOR, 'Sony'], [TYPE, MOBILE]], [

            /(SM-G900[F|H])/i                                                   // Samsung Galaxy S5
            ], [[MODEL, 'Galaxy S5'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G7102)/i                                                       // Samsung Galaxy Grand 2
            ], [[MODEL, 'Galaxy Grand 2'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G530H)/i                                                       // Samsung Galaxy Grand Prime
            ], [[MODEL, 'Galaxy Grand Prime'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-G313HZ)/i                                                      // Samsung Galaxy V
            ], [[MODEL, 'Galaxy V'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T805)/i                                                        // Samsung Galaxy Tab S 10.5
            ], [[MODEL, 'Galaxy Tab S 10.5'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [
            /(SM-G800F)/i                                                       // Samsung Galaxy S5 Mini
            ], [[MODEL, 'Galaxy S5 Mini'], [VENDOR, 'Samsung'], [TYPE, MOBILE]], [
            /(SM-T311)/i                                                        // Samsung Galaxy Tab 3 8.0
            ], [[MODEL, 'Galaxy Tab 3 8.0'], [VENDOR, 'Samsung'], [TYPE, TABLET]], [

            /(T3C)/i                                                            // Advan Vandroid T3C
            ], [MODEL, [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN T1J\+)/i                                                    // Advan Vandroid T1J+
            ], [[MODEL, 'Vandroid T1J+'], [VENDOR, 'Advan'], [TYPE, TABLET]], [
            /(ADVAN S4A)/i                                                      // Advan Vandroid S4A
            ], [[MODEL, 'Vandroid S4A'], [VENDOR, 'Advan'], [TYPE, MOBILE]], [

            /(V972M)/i                                                          // ZTE V972M
            ], [MODEL, [VENDOR, 'ZTE'], [TYPE, MOBILE]], [

            /(i-mobile)\s(IQ\s[\d\.]+)/i                                        // i-mobile IQ
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(IQ6.3)/i                                                          // i-mobile IQ IQ 6.3
            ], [[MODEL, 'IQ 6.3'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [
            /(i-mobile)\s(i-style\s[\d\.]+)/i                                   // i-mobile i-STYLE
            ], [VENDOR, MODEL, [TYPE, MOBILE]], [
            /(i-STYLE2.1)/i                                                     // i-mobile i-STYLE 2.1
            ], [[MODEL, 'i-STYLE 2.1'], [VENDOR, 'i-mobile'], [TYPE, MOBILE]], [

            /(mobiistar touch LAI 512)/i                                        // mobiistar touch LAI 512
            ], [[MODEL, 'Touch LAI 512'], [VENDOR, 'mobiistar'], [TYPE, MOBILE]], [

            /////////////
            // END TODO
            ///////////*/

        ],

        engine : [[

            /windows.+\sedge\/([\w\.]+)/i                                       // EdgeHTML
            ], [VERSION, [NAME, 'EdgeHTML']], [

            /(presto)\/([\w\.]+)/i,                                             // Presto
            /(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,     // WebKit/Trident/NetFront/NetSurf/Amaya/Lynx/w3m
            /(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,                          // KHTML/Tasman/Links
            /(icab)[\/\s]([23]\.[\d\.]+)/i                                      // iCab
            ], [NAME, VERSION], [

            /rv\:([\w\.]+).*(gecko)/i                                           // Gecko
            ], [VERSION, NAME]
        ],

        os : [[

            // Windows based
            /microsoft\s(windows)\s(vista|xp)/i                                 // Windows (iTunes)
            ], [NAME, VERSION], [
            /(windows)\snt\s6\.2;\s(arm)/i,                                     // Windows RT
            /(windows\sphone(?:\sos)*)[\s\/]?([\d\.\s]+\w)*/i,                  // Windows Phone
            /(windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i
            ], [NAME, [VERSION, mapper.str, maps.os.windows.version]], [
            /(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i
            ], [[NAME, 'Windows'], [VERSION, mapper.str, maps.os.windows.version]], [

            // Mobile/Embedded OS
            /\((bb)(10);/i                                                      // BlackBerry 10
            ], [[NAME, 'BlackBerry'], VERSION], [
            /(blackberry)\w*\/?([\w\.]+)*/i,                                    // Blackberry
            /(tizen)[\/\s]([\w\.]+)/i,                                          // Tizen
            /(android|webos|palm\sos|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,
                                                                                // Android/WebOS/Palm/QNX/Bada/RIM/MeeGo/Contiki
            /linux;.+(sailfish);/i                                              // Sailfish OS
            ], [NAME, VERSION], [
            /(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i                 // Symbian
            ], [[NAME, 'Symbian'], VERSION], [
            /\((series40);/i                                                    // Series 40
            ], [NAME], [
            /mozilla.+\(mobile;.+gecko.+firefox/i                               // Firefox OS
            ], [[NAME, 'Firefox OS'], VERSION], [

            // Console
            /(nintendo|playstation)\s([wids34portablevu]+)/i,                   // Nintendo/Playstation

            // GNU/Linux based
            /(mint)[\/\s\(]?(\w+)*/i,                                           // Mint
            /(mageia|vectorlinux)[;\s]/i,                                       // Mageia/VectorLinux
            /(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|(?=\s)arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?(?!chrom)([\w\.-]+)*/i,
                                                                                // Joli/Ubuntu/Debian/SUSE/Gentoo/Arch/Slackware
                                                                                // Fedora/Mandriva/CentOS/PCLinuxOS/RedHat/Zenwalk/Linpus
            /(hurd|linux)\s?([\w\.]+)*/i,                                       // Hurd/Linux
            /(gnu)\s?([\w\.]+)*/i                                               // GNU
            ], [NAME, VERSION], [

            /(cros)\s[\w]+\s([\w\.]+\w)/i                                       // Chromium OS
            ], [[NAME, 'Chromium OS'], VERSION],[

            // Solaris
            /(sunos)\s?([\w\.]+\d)*/i                                           // Solaris
            ], [[NAME, 'Solaris'], VERSION], [

            // BSD based
            /\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i                   // FreeBSD/NetBSD/OpenBSD/PC-BSD/DragonFly
            ], [NAME, VERSION],[

            /(haiku)\s(\w+)/i                                                  // Haiku
            ], [NAME, VERSION],[

            /cfnetwork\/.+darwin/i,
            /ip[honead]+(?:.*os\s([\w]+)\slike\smac|;\sopera)/i                 // iOS
            ], [[VERSION, /_/g, '.'], [NAME, 'iOS']], [

            /(mac\sos\sx)\s?([\w\s\.]+\w)*/i,
            /(macintosh|mac(?=_powerpc)\s)/i                                    // Mac OS
            ], [[NAME, 'Mac OS'], [VERSION, /_/g, '.']], [

            // Other
            /((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,                            // Solaris
            /(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,                               // AIX
            /(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,
                                                                                // Plan9/Minix/BeOS/OS2/AmigaOS/MorphOS/RISCOS/OpenVMS
            /(unix)\s?([\w\.]+)*/i                                              // UNIX
            ], [NAME, VERSION]
        ]
    };


    /////////////////
    // Constructor
    ////////////////
    /*
    var Browser = function (name, version) {
        this[NAME] = name;
        this[VERSION] = version;
    };
    var CPU = function (arch) {
        this[ARCHITECTURE] = arch;
    };
    var Device = function (vendor, model, type) {
        this[VENDOR] = vendor;
        this[MODEL] = model;
        this[TYPE] = type;
    };
    var Engine = Browser;
    var OS = Browser;
    */
    var UAParser = function (uastring, extensions) {

        if (typeof uastring === 'object') {
            extensions = uastring;
            uastring = undefined;
        }

        if (!(this instanceof UAParser)) {
            return new UAParser(uastring, extensions).getResult();
        }

        var ua = uastring || ((window && window.navigator && window.navigator.userAgent) ? window.navigator.userAgent : EMPTY);
        var rgxmap = extensions ? util.extend(regexes, extensions) : regexes;
        //var browser = new Browser();
        //var cpu = new CPU();
        //var device = new Device();
        //var engine = new Engine();
        //var os = new OS();

        this.getBrowser = function () {
            var browser = { name: undefined, version: undefined };
            mapper.rgx.call(browser, ua, rgxmap.browser);
            browser.major = util.major(browser.version); // deprecated
            return browser;
        };
        this.getCPU = function () {
            var cpu = { architecture: undefined };
            mapper.rgx.call(cpu, ua, rgxmap.cpu);
            return cpu;
        };
        this.getDevice = function () {
            var device = { vendor: undefined, model: undefined, type: undefined };
            mapper.rgx.call(device, ua, rgxmap.device);
            return device;
        };
        this.getEngine = function () {
            var engine = { name: undefined, version: undefined };
            mapper.rgx.call(engine, ua, rgxmap.engine);
            return engine;
        };
        this.getOS = function () {
            var os = { name: undefined, version: undefined };
            mapper.rgx.call(os, ua, rgxmap.os);
            return os;
        };
        this.getResult = function () {
            return {
                ua      : this.getUA(),
                browser : this.getBrowser(),
                engine  : this.getEngine(),
                os      : this.getOS(),
                device  : this.getDevice(),
                cpu     : this.getCPU()
            };
        };
        this.getUA = function () {
            return ua;
        };
        this.setUA = function (uastring) {
            ua = uastring;
            //browser = new Browser();
            //cpu = new CPU();
            //device = new Device();
            //engine = new Engine();
            //os = new OS();
            return this;
        };
        return this;
    };

    UAParser.VERSION = LIBVERSION;
    UAParser.BROWSER = {
        NAME    : NAME,
        MAJOR   : MAJOR, // deprecated
        VERSION : VERSION
    };
    UAParser.CPU = {
        ARCHITECTURE : ARCHITECTURE
    };
    UAParser.DEVICE = {
        MODEL   : MODEL,
        VENDOR  : VENDOR,
        TYPE    : TYPE,
        CONSOLE : CONSOLE,
        MOBILE  : MOBILE,
        SMARTTV : SMARTTV,
        TABLET  : TABLET,
        WEARABLE: WEARABLE,
        EMBEDDED: EMBEDDED
    };
    UAParser.ENGINE = {
        NAME    : NAME,
        VERSION : VERSION
    };
    UAParser.OS = {
        NAME    : NAME,
        VERSION : VERSION
    };
    //UAParser.Utils = util;

    ///////////
    // Export
    //////////


    // check js environment
    if (typeof(exports) !== UNDEF_TYPE) {
        // nodejs env
        if (typeof module !== UNDEF_TYPE && module.exports) {
            exports = module.exports = UAParser;
        }
        // TODO: test!!!!!!!!
        /*
        if (require && require.main === module && process) {
            // cli
            var jsonize = function (arr) {
                var res = [];
                for (var i in arr) {
                    res.push(new UAParser(arr[i]).getResult());
                }
                process.stdout.write(JSON.stringify(res, null, 2) + '\n');
            };
            if (process.stdin.isTTY) {
                // via args
                jsonize(process.argv.slice(2));
            } else {
                // via pipe
                var str = '';
                process.stdin.on('readable', function() {
                    var read = process.stdin.read();
                    if (read !== null) {
                        str += read;
                    }
                });
                process.stdin.on('end', function () {
                    jsonize(str.replace(/\n$/, '').split('\n'));
                });
            }
        }
        */
        exports.UAParser = UAParser;
    } else {
        // requirejs env (optional)
        if (typeof(define) === FUNC_TYPE && define.amd) {
            define(function () {
                return UAParser;
            });
        } else if (window) {
            // browser env
            window.UAParser = UAParser;
        }
    }

    // jQuery/Zepto specific (optional)
    // Note:
    //   In AMD env the global scope should be kept clean, but jQuery is an exception.
    //   jQuery always exports to global scope, unless jQuery.noConflict(true) is used,
    //   and we should catch that.
    var $ = window && (window.jQuery || window.Zepto);
    if (typeof $ !== UNDEF_TYPE) {
        var parser = new UAParser();
        $.ua = parser.getResult();
        $.ua.get = function () {
            return parser.getUA();
        };
        $.ua.set = function (uastring) {
            parser.setUA(uastring);
            var result = parser.getResult();
            for (var prop in result) {
                $.ua[prop] = result[prop];
            }
        };
    }

})(typeof window === 'object' ? window : this);

},{}],19:[function(require,module,exports){
var v1 = require('./v1');
var v4 = require('./v4');

var uuid = v4;
uuid.v1 = v1;
uuid.v4 = v4;

module.exports = uuid;

},{"./v1":22,"./v4":23}],20:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],21:[function(require,module,exports){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && msCrypto.getRandomValues.bind(msCrypto));
if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

},{}],22:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

var _nodeId;
var _clockseq;

// Previous uuid creation time
var _lastMSecs = 0;
var _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};
  var node = options.node || _nodeId;
  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189
  if (node == null || clockseq == null) {
    var seedBytes = rng();
    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [
        seedBytes[0] | 0x01,
        seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]
      ];
    }
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  }

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":20,"./lib/rng":21}],23:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid(rnds);
}

module.exports = v4;

},{"./lib/bytesToUuid":20,"./lib/rng":21}],24:[function(require,module,exports){
/*
WildEmitter.js is a slim little event emitter by @henrikjoreteg largely based
on @visionmedia's Emitter from UI Kit.

Why? I wanted it standalone.

I also wanted support for wildcard emitters like this:

emitter.on('*', function (eventName, other, event, payloads) {

});

emitter.on('somenamespace*', function (eventName, payloads) {

});

Please note that callbacks triggered by wildcard registered events also get
the event name as the first argument.
*/

module.exports = WildEmitter;

function WildEmitter() { }

WildEmitter.mixin = function (constructor) {
    var prototype = constructor.prototype || constructor;

    prototype.isWildEmitter= true;

    // Listen on the given `event` with `fn`. Store a group name if present.
    prototype.on = function (event, groupName, fn) {
        this.callbacks = this.callbacks || {};
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };

    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    prototype.once = function (event, groupName, fn) {
        var self = this,
            hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        function on() {
            self.off(event, on);
            func.apply(this, arguments);
        }
        this.on(event, group, on);
        return this;
    };

    // Unbinds an entire group
    prototype.releaseGroup = function (groupName) {
        this.callbacks = this.callbacks || {};
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };

    // Remove the given callback for `event` or all
    // registered callbacks.
    prototype.off = function (event, fn) {
        this.callbacks = this.callbacks || {};
        var callbacks = this.callbacks[event],
            i;

        if (!callbacks) return this;

        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }

        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        if (callbacks.length === 0) {
            delete this.callbacks[event];
        }
        return this;
    };

    /// Emit `event` with the given args.
    // also calls any `*` handlers
    prototype.emit = function (event) {
        this.callbacks = this.callbacks || {};
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item,
            listeners;

        if (callbacks) {
            listeners = callbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, args);
            }
        }

        if (specialCallbacks) {
            len = specialCallbacks.length;
            listeners = specialCallbacks.slice();
            for (i = 0, len = listeners.length; i < len; ++i) {
                if (!listeners[i]) {
                    break;
                }
                listeners[i].apply(this, [event].concat(args));
            }
        }

        return this;
    };

    // Helper for for finding special wildcard event handlers that match the event
    prototype.getWildcardCallbacks = function (eventName) {
        this.callbacks = this.callbacks || {};
        var item,
            split,
            result = [];

        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[0].length) === split[0])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };

};

WildEmitter.mixin(WildEmitter);

},{}],25:[function(require,module,exports){
/*!
 * EventEmitter v5.2.4 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(this || {}));

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenVidu_1 = require("./OpenVidu/OpenVidu");
if (window) {
    window['OpenVidu'] = OpenVidu_1.OpenVidu;
}

},{"./OpenVidu/OpenVidu":29}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = require("./Stream");
var Connection = (function () {
    function Connection(session, opts) {
        this.session = session;
        this.disposed = false;
        var msg = "'Connection' created ";
        if (!!opts) {
            msg += "(remote) with 'connectionId' [" + opts.id + ']';
        }
        else {
            msg += '(local)';
        }
        console.info(msg);
        this.options = opts;
        if (!!opts) {
            this.connectionId = opts.id;
            if (opts.metadata) {
                this.data = opts.metadata;
            }
            if (opts.streams) {
                this.initRemoteStreams(opts.streams);
            }
        }
        this.creationTime = new Date().getTime();
    }
    Connection.prototype.sendIceCandidate = function (candidate) {
        console.debug((!!this.stream.outboundStreamOpts ? 'Local' : 'Remote'), 'candidate for', this.connectionId, JSON.stringify(candidate));
        this.session.openvidu.sendRequest('onIceCandidate', {
            endpointName: this.connectionId,
            candidate: candidate.candidate,
            sdpMid: candidate.sdpMid,
            sdpMLineIndex: candidate.sdpMLineIndex
        }, function (error, response) {
            if (error) {
                console.error('Error sending ICE candidate: '
                    + JSON.stringify(error));
            }
        });
    };
    Connection.prototype.initRemoteStreams = function (options) {
        var _this = this;
        options.forEach(function (opts) {
            var streamOptions = {
                id: opts.id,
                connection: _this,
                frameRate: opts.frameRate,
                recvAudio: opts.audioActive,
                recvVideo: opts.videoActive,
                typeOfVideo: opts.typeOfVideo
            };
            var stream = new Stream_1.Stream(_this.session, streamOptions);
            _this.addStream(stream);
        });
        console.info("Remote 'Connection' with 'connectionId' [" + this.connectionId + '] is now configured for receiving Streams with options: ', this.stream.inboundStreamOpts);
    };
    Connection.prototype.addStream = function (stream) {
        stream.connection = this;
        this.stream = stream;
    };
    Connection.prototype.removeStream = function (streamId) {
        delete this.stream;
    };
    Connection.prototype.dispose = function () {
        if (!!this.stream) {
            delete this.stream;
        }
        this.disposed = true;
    };
    return Connection;
}());
exports.Connection = Connection;

},{"./Stream":32}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState_1 = require("../OpenViduInternal/Enums/LocalRecorderState");
var LocalRecorder = (function () {
    function LocalRecorder(stream) {
        this.stream = stream;
        this.chunks = [];
        this.count = 0;
        this.connectionId = (!!this.stream.connection) ? this.stream.connection.connectionId : 'default-connection';
        this.id = this.stream.streamId + '_' + this.connectionId + '_localrecord';
        this.state = LocalRecorderState_1.LocalRecorderState.READY;
    }
    LocalRecorder.prototype.record = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (typeof MediaRecorder === 'undefined') {
                    console.error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder');
                    throw (Error('MediaRecorder not supported on your browser. See compatibility in https://caniuse.com/#search=MediaRecorder'));
                }
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.READY) {
                    throw (Error('\'LocalRecord.record()\' needs \'LocalRecord.state\' to be \'READY\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.clean()\' or init a new LocalRecorder before'));
                }
                console.log("Starting local recording of stream '" + _this.stream.streamId + "' of connection '" + _this.connectionId + "'");
                if (typeof MediaRecorder.isTypeSupported === 'function') {
                    var options = void 0;
                    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                        options = { mimeType: 'video/webm;codecs=vp9' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                        options = { mimeType: 'video/webm;codecs=h264' };
                    }
                    else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
                        options = { mimeType: 'video/webm;codecs=vp8' };
                    }
                    console.log('Using mimeType ' + options.mimeType);
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream(), options);
                }
                else {
                    console.warn('isTypeSupported is not supported, using default codecs for browser');
                    _this.mediaRecorder = new MediaRecorder(_this.stream.getMediaStream());
                }
                _this.mediaRecorder.start(10);
            }
            catch (err) {
                reject(err);
            }
            _this.mediaRecorder.ondataavailable = function (e) {
                _this.chunks.push(e.data);
            };
            _this.mediaRecorder.onerror = function (e) {
                console.error('MediaRecorder error: ', e);
            };
            _this.mediaRecorder.onstart = function () {
                console.log('MediaRecorder started (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onstop = function () {
                _this.onStopDefault();
            };
            _this.mediaRecorder.onpause = function () {
                console.log('MediaRecorder paused (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onresume = function () {
                console.log('MediaRecorder resumed (state=' + _this.mediaRecorder.state + ')');
            };
            _this.mediaRecorder.onwarning = function (e) {
                console.log('MediaRecorder warning: ' + e);
            };
            _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            resolve();
        });
    };
    LocalRecorder.prototype.stop = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state === LocalRecorderState_1.LocalRecorderState.READY || _this.state === LocalRecorderState_1.LocalRecorderState.FINISHED) {
                    throw (Error('\'LocalRecord.stop()\' needs \'LocalRecord.state\' to be \'RECORDING\' or \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' before'));
                }
                _this.mediaRecorder.onstop = function () {
                    _this.onStopDefault();
                    resolve();
                };
                _this.mediaRecorder.stop();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    LocalRecorder.prototype.pause = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.RECORDING) {
                    reject(Error('\'LocalRecord.pause()\' needs \'LocalRecord.state\' to be \'RECORDING\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.start()\' or \'LocalRecorder.resume()\' before'));
                }
                _this.mediaRecorder.pause();
                _this.state = LocalRecorderState_1.LocalRecorderState.PAUSED;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.resume = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this.state !== LocalRecorderState_1.LocalRecorderState.PAUSED) {
                    throw (Error('\'LocalRecord.resume()\' needs \'LocalRecord.state\' to be \'PAUSED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.pause()\' before'));
                }
                _this.mediaRecorder.resume();
                _this.state = LocalRecorderState_1.LocalRecorderState.RECORDING;
            }
            catch (error) {
                reject(error);
            }
        });
    };
    LocalRecorder.prototype.preview = function (parentElement) {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.preview()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        this.videoPreview = document.createElement('video');
        this.videoPreview.id = this.id;
        this.videoPreview.autoplay = true;
        if (typeof parentElement === 'string') {
            this.htmlParentElementId = parentElement;
            var parentElementDom = document.getElementById(parentElement);
            if (parentElementDom) {
                this.videoPreview = parentElementDom.appendChild(this.videoPreview);
            }
        }
        else {
            this.htmlParentElementId = parentElement.id;
            this.videoPreview = parentElement.appendChild(this.videoPreview);
        }
        this.videoPreview.src = this.videoPreviewSrc;
        return this.videoPreview;
    };
    LocalRecorder.prototype.clean = function () {
        var _this = this;
        var f = function () {
            delete _this.blob;
            _this.chunks = [];
            _this.count = 0;
            delete _this.mediaRecorder;
            _this.state = LocalRecorderState_1.LocalRecorderState.READY;
        };
        if (this.state === LocalRecorderState_1.LocalRecorderState.RECORDING || this.state === LocalRecorderState_1.LocalRecorderState.PAUSED) {
            this.stop().then(function () { return f(); }).catch(function () { return f(); });
        }
        else {
            f();
        }
    };
    LocalRecorder.prototype.download = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('\'LocalRecord.download()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + this.state + '\'). Call \'LocalRecorder.stop()\' before'));
        }
        else {
            var a = document.createElement('a');
            a.style.display = 'none';
            document.body.appendChild(a);
            var url = window.URL.createObjectURL(this.blob);
            a.href = url;
            a.download = this.id + '.webm';
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };
    LocalRecorder.prototype.getBlob = function () {
        if (this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
            throw (Error('Call \'LocalRecord.stop()\' before getting Blob file'));
        }
        else {
            return this.blob;
        }
    };
    LocalRecorder.prototype.uploadAsBinary = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsBinary()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_1 = new XMLHttpRequest();
                http_1.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_1.setRequestHeader(key, headers[key]);
                    }
                }
                http_1.onreadystatechange = function () {
                    if (http_1.readyState === 4) {
                        if (http_1.status.toString().charAt(0) === '2') {
                            resolve(http_1.responseText);
                        }
                        else {
                            reject(http_1.status);
                        }
                    }
                };
                http_1.send(_this.blob);
            }
        });
    };
    LocalRecorder.prototype.uploadAsMultipartfile = function (endpoint, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.state !== LocalRecorderState_1.LocalRecorderState.FINISHED) {
                reject(Error('\'LocalRecord.uploadAsMultipartfile()\' needs \'LocalRecord.state\' to be \'FINISHED\' (current value: \'' + _this.state + '\'). Call \'LocalRecorder.stop()\' before'));
            }
            else {
                var http_2 = new XMLHttpRequest();
                http_2.open('POST', endpoint, true);
                if (typeof headers === 'object') {
                    for (var _i = 0, _a = Object.keys(headers); _i < _a.length; _i++) {
                        var key = _a[_i];
                        http_2.setRequestHeader(key, headers[key]);
                    }
                }
                var sendable = new FormData();
                sendable.append('file', _this.blob, _this.id + '.webm');
                http_2.onreadystatechange = function () {
                    if (http_2.readyState === 4) {
                        if (http_2.status.toString().charAt(0) === '2') {
                            resolve(http_2.responseText);
                        }
                        else {
                            reject(http_2.status);
                        }
                    }
                };
                http_2.send(sendable);
            }
        });
    };
    LocalRecorder.prototype.onStopDefault = function () {
        console.log('MediaRecorder stopped  (state=' + this.mediaRecorder.state + ')');
        this.blob = new Blob(this.chunks, { type: 'video/webm' });
        this.chunks = [];
        this.videoPreviewSrc = window.URL.createObjectURL(this.blob);
        this.state = LocalRecorderState_1.LocalRecorderState.FINISHED;
    };
    return LocalRecorder;
}());
exports.LocalRecorder = LocalRecorder;

},{"../OpenViduInternal/Enums/LocalRecorderState":34}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorder_1 = require("./LocalRecorder");
var Publisher_1 = require("./Publisher");
var Session_1 = require("./Session");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var RpcBuilder = require("../OpenViduInternal/KurentoUtils/kurento-jsonrpc");
var screenSharingAuto = require("../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto");
var screenSharing = require("../OpenViduInternal/ScreenSharing/Screen-Capturing");
var platform = require("platform");
var OpenVidu = (function () {
    function OpenVidu() {
        this.secret = '';
        this.recorder = false;
        this.advancedConfiguration = {};
        console.info("'OpenVidu' initialized");
    }
    OpenVidu.prototype.initSession = function () {
        this.session = new Session_1.Session(this);
        return this.session;
    };
    OpenVidu.prototype.initPublisher = function (targetElement, param2, param3) {
        var properties;
        if (!!param2 && (typeof param2 !== 'function')) {
            properties = param2;
            properties = {
                audioSource: (typeof properties.audioSource !== 'undefined') ? properties.audioSource : undefined,
                frameRate: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.frameRate !== 'undefined') ? properties.frameRate : undefined),
                insertMode: (typeof properties.insertMode !== 'undefined') ? ((typeof properties.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[properties.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: (typeof properties.mirror !== 'undefined') ? properties.mirror : true,
                publishAudio: (typeof properties.publishAudio !== 'undefined') ? properties.publishAudio : true,
                publishVideo: (typeof properties.publishVideo !== 'undefined') ? properties.publishVideo : true,
                resolution: this.isMediaStreamTrack(properties.videoSource) ? undefined : ((typeof properties.resolution !== 'undefined') ? properties.resolution : '640x480'),
                videoSource: (typeof properties.videoSource !== 'undefined') ? properties.videoSource : undefined
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                mirror: true,
                publishAudio: true,
                publishVideo: true,
                resolution: '640x480'
            };
        }
        var publisher = new Publisher_1.Publisher(targetElement, properties, this);
        var completionHandler;
        if (!!param2 && (typeof param2 === 'function')) {
            completionHandler = param2;
        }
        else if (!!param3) {
            completionHandler = param3;
        }
        publisher.initialize()
            .then(function () {
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
            publisher.emitEvent('accessAllowed', []);
        }).catch(function (error) {
            if (!!completionHandler !== undefined) {
                completionHandler(error);
            }
            publisher.emitEvent('accessDenied', []);
        });
        return publisher;
    };
    OpenVidu.prototype.initPublisherAsync = function (targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var publisher;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(publisher);
                }
            };
            if (!!properties) {
                publisher = _this.initPublisher(targetElement, properties, callback);
            }
            else {
                publisher = _this.initPublisher(targetElement, callback);
            }
        });
    };
    OpenVidu.prototype.initLocalRecorder = function (stream) {
        return new LocalRecorder_1.LocalRecorder(stream);
    };
    OpenVidu.prototype.checkSystemRequirements = function () {
        var browser = platform.name;
        var version = platform.version;
        if ((browser !== 'Chrome') && (browser !== 'Chrome Mobile') &&
            (browser !== 'Firefox') && (browser !== 'Firefox Mobile') && (browser !== 'Firefox for iOS') &&
            (browser !== 'Opera') && (browser !== 'Opera Mobile') &&
            (browser !== 'Safari')) {
            return 0;
        }
        else {
            return 1;
        }
    };
    OpenVidu.prototype.getDevices = function () {
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices.enumerateDevices().then(function (deviceInfos) {
                var devices = [];
                deviceInfos.forEach(function (deviceInfo) {
                    if (deviceInfo.kind === 'audioinput' || deviceInfo.kind === 'videoinput') {
                        devices.push({
                            kind: deviceInfo.kind,
                            deviceId: deviceInfo.deviceId,
                            label: deviceInfo.label
                        });
                    }
                });
                resolve(devices);
            }).catch(function (error) {
                console.error('Error getting devices', error);
                reject(error);
            });
        });
    };
    OpenVidu.prototype.getUserMedia = function (options) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.generateMediaConstraints(options)
                .then(function (constraints) {
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(function (mediaStream) {
                    resolve(mediaStream);
                })
                    .catch(function (error) {
                    var errorName;
                    var errorMessage = error.toString();
                    if (!(options.videoSource === 'screen')) {
                        errorName = (options.videoSource === false || options.videoSource === null) ? OpenViduError_1.OpenViduErrorName.MICROPHONE_ACCESS_DENIED : OpenViduError_1.OpenViduErrorName.CAMERA_ACCESS_DENIED;
                    }
                    else {
                        errorName = OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED;
                    }
                    reject(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                });
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    OpenVidu.prototype.enableProdMode = function () {
        console.log = function () { };
        console.debug = function () { };
        console.info = function () { };
        console.warn = function () { };
    };
    OpenVidu.prototype.setAdvancedConfiguration = function (configuration) {
        this.advancedConfiguration = configuration;
    };
    OpenVidu.prototype.generateMediaConstraints = function (publisherProperties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var audio, video;
            if (publisherProperties.audioSource === null || publisherProperties.audioSource === false) {
                audio = false;
            }
            else if (publisherProperties.audioSource === undefined) {
                audio = true;
            }
            else {
                audio = publisherProperties.audioSource;
            }
            if (publisherProperties.videoSource === null || publisherProperties.videoSource === false) {
                video = false;
            }
            else {
                video = {
                    height: {
                        ideal: 480
                    },
                    width: {
                        ideal: 640
                    }
                };
            }
            var mediaConstraints = {
                audio: audio,
                video: video
            };
            if (typeof mediaConstraints.audio === 'string') {
                mediaConstraints.audio = { deviceId: { exact: mediaConstraints.audio } };
            }
            if (mediaConstraints.video) {
                if (!!publisherProperties.resolution) {
                    var widthAndHeight = publisherProperties.resolution.toLowerCase().split('x');
                    var width = Number(widthAndHeight[0]);
                    var height = Number(widthAndHeight[1]);
                    mediaConstraints.video.width.ideal = width;
                    mediaConstraints.video.height.ideal = height;
                }
                if (!!publisherProperties.frameRate) {
                    mediaConstraints.video.frameRate = { ideal: publisherProperties.frameRate };
                }
                if (!!publisherProperties.videoSource && typeof publisherProperties.videoSource === 'string') {
                    if (publisherProperties.videoSource === 'screen') {
                        if (platform.name !== 'Chrome' && platform.name !== 'Firefox') {
                            var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_SHARING_NOT_SUPPORTED, 'You can only screen share in desktop Chrome and Firefox. Detected browser: ' + platform.name);
                            console.error(error);
                            reject(error);
                        }
                        else {
                            if (!!_this.advancedConfiguration.screenShareChromeExtension) {
                                var extensionId = _this.advancedConfiguration.screenShareChromeExtension.split('/').pop().trim();
                                screenSharing.getChromeExtensionStatus(extensionId, function (status) {
                                    if (status === 'installed-enabled') {
                                        screenSharing.getScreenConstraints(function (error, screenConstraints) {
                                            if (!!error && error === 'permission-denied') {
                                                var error_1 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                                console.error(error_1);
                                                reject(error_1);
                                            }
                                            else {
                                                mediaConstraints.video = screenConstraints;
                                                resolve(mediaConstraints);
                                            }
                                        });
                                    }
                                    if (status === 'installed-disabled') {
                                        var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                        console.error(error);
                                        reject(error);
                                    }
                                    if (status === 'not-installed') {
                                        var error = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, _this.advancedConfiguration.screenShareChromeExtension);
                                        console.error(error);
                                        reject(error);
                                    }
                                });
                            }
                            else {
                                screenSharingAuto.getScreenId(function (error, sourceId, screenConstraints) {
                                    if (!!error) {
                                        if (error === 'not-installed') {
                                            var error_2 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_NOT_INSTALLED, 'https://chrome.google.com/webstore/detail/screen-capturing/ajhifddimkapgcifgcodmmfdlknahffk');
                                            console.error(error_2);
                                            reject(error_2);
                                        }
                                        else if (error === 'installed-disabled') {
                                            var error_3 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_EXTENSION_DISABLED, 'You must enable the screen extension');
                                            console.error(error_3);
                                            reject(error_3);
                                        }
                                        else if (error === 'permission-denied') {
                                            var error_4 = new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED, 'You must allow access to one window of your desktop');
                                            console.error(error_4);
                                            reject(error_4);
                                        }
                                    }
                                    else {
                                        mediaConstraints.video = screenConstraints.video;
                                        resolve(mediaConstraints);
                                    }
                                });
                            }
                            publisherProperties.videoSource = 'screen';
                        }
                    }
                    else {
                        mediaConstraints.video['deviceId'] = { exact: publisherProperties.videoSource };
                        resolve(mediaConstraints);
                    }
                }
                else {
                    resolve(mediaConstraints);
                }
            }
            else {
                resolve(mediaConstraints);
            }
        });
    };
    OpenVidu.prototype.startWs = function (onConnectSucces) {
        var config = {
            heartbeat: 5000,
            sendCloseMessage: false,
            ws: {
                uri: this.wsUri,
                useSockJS: false,
                onconnected: onConnectSucces,
                ondisconnect: this.disconnectCallback.bind(this),
                onreconnecting: this.reconnectingCallback.bind(this),
                onreconnected: this.reconnectedCallback.bind(this)
            },
            rpc: {
                requestTimeout: 15000,
                participantJoined: this.session.onParticipantJoined.bind(this.session),
                participantPublished: this.session.onParticipantPublished.bind(this.session),
                participantUnpublished: this.session.onParticipantUnpublished.bind(this.session),
                participantLeft: this.session.onParticipantLeft.bind(this.session),
                participantEvicted: this.session.onParticipantEvicted.bind(this.session),
                recordingStarted: this.session.onRecordingStarted.bind(this.session),
                recordingStopped: this.session.onRecordingStopped.bind(this.session),
                sendMessage: this.session.onNewMessage.bind(this.session),
                iceCandidate: this.session.recvIceCandidate.bind(this.session),
                mediaError: this.session.onMediaError.bind(this.session)
            }
        };
        this.jsonRpcClient = new RpcBuilder.clients.JsonRpcClient(config);
    };
    OpenVidu.prototype.closeWs = function () {
        this.jsonRpcClient.close();
    };
    OpenVidu.prototype.sendRequest = function (method, params, callback) {
        if (params && params instanceof Function) {
            callback = params;
            params = {};
        }
        console.debug('Sending request: {method:"' + method + '", params: ' + JSON.stringify(params) + '}');
        this.jsonRpcClient.send(method, params, callback);
    };
    OpenVidu.prototype.isMediaStreamTrack = function (mediaSource) {
        var is = (!!mediaSource &&
            mediaSource.enabled !== undefined && typeof mediaSource.enabled === 'boolean' &&
            mediaSource.id !== undefined && typeof mediaSource.id === 'string' &&
            mediaSource.kind !== undefined && typeof mediaSource.kind === 'string' &&
            mediaSource.label !== undefined && typeof mediaSource.label === 'string' &&
            mediaSource.muted !== undefined && typeof mediaSource.muted === 'boolean' &&
            mediaSource.readyState !== undefined && typeof mediaSource.readyState === 'string');
        return is;
    };
    OpenVidu.prototype.getWsUri = function () {
        return this.wsUri;
    };
    OpenVidu.prototype.getSecret = function () {
        return this.secret;
    };
    OpenVidu.prototype.getRecorder = function () {
        return this.recorder;
    };
    OpenVidu.prototype.disconnectCallback = function () {
        console.warn('Websocket connection lost');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectingCallback = function () {
        console.warn('Websocket connection lost (reconnecting)');
        if (this.isRoomAvailable()) {
            this.session.onLostConnection();
        }
        else {
            alert('Connection error. Please reload page.');
        }
    };
    OpenVidu.prototype.reconnectedCallback = function () {
        console.warn('Websocket reconnected');
    };
    OpenVidu.prototype.isRoomAvailable = function () {
        if (this.session !== undefined && this.session instanceof Session_1.Session) {
            return true;
        }
        else {
            console.warn('Session instance not found');
            return false;
        }
    };
    return OpenVidu;
}());
exports.OpenVidu = OpenVidu;

},{"../OpenViduInternal/Enums/OpenViduError":35,"../OpenViduInternal/Enums/VideoInsertMode":36,"../OpenViduInternal/KurentoUtils/kurento-jsonrpc":50,"../OpenViduInternal/ScreenSharing/Screen-Capturing":57,"../OpenViduInternal/ScreenSharing/Screen-Capturing-Auto":56,"./LocalRecorder":28,"./Publisher":30,"./Session":31,"platform":9}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Stream_1 = require("./Stream");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var EventEmitter = require("wolfy87-eventemitter");
var Publisher = (function () {
    function Publisher(targetElement, properties, openvidu) {
        var _this = this;
        this.openvidu = openvidu;
        this.accessAllowed = false;
        this.ee = new EventEmitter();
        this.properties = properties;
        this.stream = new Stream_1.Stream(this.session, { publisherProperties: properties, mediaConstraints: {} });
        this.stream.on('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
        this.stream.on('stream-destroyed-by-disconnect', function (reason) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', _this.stream, reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        });
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }
        if (!this.element) {
            console.warn("The provided 'targetElement' for the Publisher couldn't be resolved to any HTML element: " + targetElement);
        }
    }
    Publisher.prototype.publishAudio = function (value) {
        this.stream.getWebRtcPeer().audioEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its audio stream');
    };
    Publisher.prototype.publishVideo = function (value) {
        this.stream.getWebRtcPeer().videoEnabled = value;
        console.info("'Publisher' has " + (value ? 'published' : 'unpublished') + ' its video stream');
    };
    Publisher.prototype.subscribeToRemote = function () {
        this.stream.subscribeToMyRemote();
    };
    Publisher.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.on('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.on('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.on('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            }
            else {
                this.stream.on('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    Publisher.prototype.once = function (type, handler) {
        var _this = this;
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Publisher'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Publisher'");
            }
            handler(event);
        });
        if (type === 'streamCreated') {
            if (!!this.stream && this.stream.isPublisherPublished) {
                this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, this, 'streamCreated', this.stream, '')]);
            }
            else {
                this.stream.once('stream-created-by-publisher', function () {
                    _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', _this.stream, '')]);
                });
            }
        }
        if (type === 'videoElementCreated') {
            if (!!this.stream && this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        if (type === 'remoteVideoPlaying') {
            var video = this.stream.getVideoElement();
            if (this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'remoteVideoPlaying')]);
            }
            else {
                this.stream.once('remote-video-is-playing', function (element) {
                    _this.ee.emitEvent('remoteVideoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'remoteVideoPlaying')]);
                });
            }
        }
        if (type === 'accessAllowed') {
            if (this.stream.accessIsAllowed) {
                this.ee.emitEvent('accessAllowed');
            }
        }
        if (type === 'accessDenied') {
            if (this.stream.accessIsDenied) {
                this.ee.emitEvent('accessDenied');
            }
        }
        return this;
    };
    Publisher.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    Publisher.prototype.initialize = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var errorCallback = function (openViduError) {
                _this.stream.accessIsDenied = true;
                _this.stream.accessIsAllowed = false;
                reject(openViduError);
            };
            var successCallback = function (mediaStream) {
                _this.stream.accessIsAllowed = true;
                _this.stream.accessIsDenied = false;
                if (_this.openvidu.isMediaStreamTrack(_this.properties.audioSource)) {
                    mediaStream.removeTrack(mediaStream.getAudioTracks()[0]);
                    mediaStream.addTrack(_this.properties.audioSource);
                }
                if (_this.openvidu.isMediaStreamTrack(_this.properties.videoSource)) {
                    mediaStream.removeTrack(mediaStream.getVideoTracks()[0]);
                    mediaStream.addTrack(_this.properties.videoSource);
                }
                if (!!mediaStream.getAudioTracks()[0]) {
                    mediaStream.getAudioTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishAudio;
                }
                if (!!mediaStream.getVideoTracks()[0]) {
                    mediaStream.getVideoTracks()[0].enabled = !!_this.stream.outboundStreamOpts.publisherProperties.publishVideo;
                }
                _this.stream.setMediaStream(mediaStream);
                _this.stream.insertVideo(_this.element, _this.properties.insertMode);
                resolve();
            };
            _this.openvidu.generateMediaConstraints(_this.properties)
                .then(function (constraints) {
                var outboundStreamOptions = {
                    mediaConstraints: constraints,
                    publisherProperties: _this.properties
                };
                _this.stream.setOutboundStreamOptions(outboundStreamOptions);
                var constraintsAux = {};
                var timeForDialogEvent = 1250;
                if (_this.stream.isSendVideo()) {
                    constraintsAux.audio = false;
                    constraintsAux.video = constraints.video;
                    var startTime_1 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraintsAux)
                        .then(function (videoOnlyStream) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        if (_this.stream.isSendAudio()) {
                            constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                            constraintsAux.video = false;
                            startTime_1 = Date.now();
                            _this.setPermissionDialogTimer(timeForDialogEvent);
                            navigator.mediaDevices.getUserMedia(constraintsAux)
                                .then(function (audioOnlyStream) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                videoOnlyStream.addTrack(audioOnlyStream.getAudioTracks()[0]);
                                successCallback(videoOnlyStream);
                            })
                                .catch(function (error) {
                                _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                                videoOnlyStream.getVideoTracks().forEach(function (track) {
                                    track.stop();
                                });
                                var errorName;
                                var errorMessage;
                                switch (error.name.toLowerCase()) {
                                    case 'notfounderror':
                                        errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                        errorMessage = error.toString();
                                        break;
                                    case 'notallowederror':
                                        errorName = OpenViduError_1.OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                        errorMessage = error.toString();
                                        break;
                                    case 'overconstrainederror':
                                        if (error.constraint.toLowerCase() === 'deviceid') {
                                            errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                            errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                        }
                                        else {
                                            errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                            errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                        }
                                }
                                errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                            });
                        }
                        else {
                            successCallback(videoOnlyStream);
                        }
                    })
                        .catch(function (error) {
                        _this.clearPermissionDialogTimer(startTime_1, timeForDialogEvent);
                        var errorName;
                        var errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                break;
                            case 'notallowederror':
                                errorName = _this.stream.isSendScreen() ? OpenViduError_1.OpenViduErrorName.SCREEN_CAPTURE_DENIED : OpenViduError_1.OpenViduErrorName.CAMERA_ACCESS_DENIED;
                                errorMessage = error.toString();
                                break;
                            case 'overconstrainederror':
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_VIDEO_DEVICE_NOT_FOUND;
                                    errorMessage = "Video input device with deviceId '" + constraints.video.deviceId.exact + "' not found";
                                }
                                else {
                                    errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Video input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                        }
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                    });
                }
                else if (_this.stream.isSendAudio()) {
                    constraintsAux.audio = (constraints.audio === undefined) ? true : constraints.audio;
                    constraintsAux.video = false;
                    var startTime_2 = Date.now();
                    _this.setPermissionDialogTimer(timeForDialogEvent);
                    navigator.mediaDevices.getUserMedia(constraints)
                        .then(function (audioOnlyStream) {
                        _this.clearPermissionDialogTimer(startTime_2, timeForDialogEvent);
                        successCallback(audioOnlyStream);
                    })
                        .catch(function (error) {
                        _this.clearPermissionDialogTimer(startTime_2, timeForDialogEvent);
                        var errorName;
                        var errorMessage;
                        switch (error.name.toLowerCase()) {
                            case 'notfounderror':
                                errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                errorMessage = error.toString();
                                break;
                            case 'notallowederror':
                                errorName = OpenViduError_1.OpenViduErrorName.MICROPHONE_ACCESS_DENIED;
                                errorMessage = error.toString();
                                break;
                            case 'overconstrainederror':
                                if (error.constraint.toLowerCase() === 'deviceid') {
                                    errorName = OpenViduError_1.OpenViduErrorName.INPUT_AUDIO_DEVICE_NOT_FOUND;
                                    errorMessage = "Audio input device with deviceId '" + constraints.audio.deviceId.exact + "' not found";
                                }
                                else {
                                    errorName = OpenViduError_1.OpenViduErrorName.PUBLISHER_PROPERTIES_ERROR;
                                    errorMessage = "Audio input device doesn't support the value passed for constraint '" + error.constraint + "'";
                                }
                        }
                        errorCallback(new OpenViduError_1.OpenViduError(errorName, errorMessage));
                    });
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.NO_INPUT_SOURCE_SET, "Properties 'audioSource' and 'videoSource' cannot be set to false or null at the same time when calling 'OpenVidu.initPublisher'"));
                }
            })
                .catch(function (error) {
                errorCallback(error);
            });
        });
    };
    Publisher.prototype.updateSession = function (session) {
        this.session = session;
        this.stream.session = session;
    };
    Publisher.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Publisher.prototype.setPermissionDialogTimer = function (waitTime) {
        var _this = this;
        this.permissionDialogTimeout = setTimeout(function () {
            _this.ee.emitEvent('accessDialogOpened', []);
        }, waitTime);
    };
    Publisher.prototype.clearPermissionDialogTimer = function (startTime, waitTime) {
        clearTimeout(this.permissionDialogTimeout);
        if ((Date.now() - startTime) > waitTime) {
            this.ee.emitEvent('accessDialogClosed', []);
        }
    };
    Publisher.prototype.userMediaHasVideo = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if ((typeof _this.properties.videoSource === 'string') && _this.properties.videoSource === 'screen') {
                resolve(true);
            }
            else {
                _this.openvidu.getDevices()
                    .then(function (devices) {
                    resolve(!!(devices.filter(function (device) {
                        return device.kind === 'videoinput';
                    })[0]));
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
        });
    };
    Publisher.prototype.userMediaHasAudio = function (callback) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.getDevices()
                .then(function (devices) {
                resolve(!!(devices.filter(function (device) {
                    return device.kind === 'audioinput';
                })[0]));
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    return Publisher;
}());
exports.Publisher = Publisher;

},{"../OpenViduInternal/Enums/OpenViduError":35,"../OpenViduInternal/Events/StreamEvent":43,"../OpenViduInternal/Events/VideoElementEvent":44,"./Stream":32,"wolfy87-eventemitter":25}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Connection_1 = require("./Connection");
var Subscriber_1 = require("./Subscriber");
var ConnectionEvent_1 = require("../OpenViduInternal/Events/ConnectionEvent");
var RecordingEvent_1 = require("../OpenViduInternal/Events/RecordingEvent");
var SessionDisconnectedEvent_1 = require("../OpenViduInternal/Events/SessionDisconnectedEvent");
var SignalEvent_1 = require("../OpenViduInternal/Events/SignalEvent");
var StreamEvent_1 = require("../OpenViduInternal/Events/StreamEvent");
var OpenViduError_1 = require("../OpenViduInternal/Enums/OpenViduError");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var platform = require("platform");
var EventEmitter = require("wolfy87-eventemitter");
var Session = (function () {
    function Session(openvidu) {
        this.remoteStreamsCreated = {};
        this.remoteConnections = {};
        this.speakingEventsEnabled = false;
        this.ee = new EventEmitter();
        this.openvidu = openvidu;
    }
    Session.prototype.connect = function (token, metadata) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.processToken(token);
            if (_this.openvidu.checkSystemRequirements()) {
                _this.options = {
                    sessionId: _this.sessionId,
                    participantId: token,
                    metadata: !!metadata ? _this.stringClientMetadata(metadata) : ''
                };
                _this.connectAux(token).then(function () {
                    resolve();
                }).catch(function (error) {
                    reject(error);
                });
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.BROWSER_NOT_SUPPORTED, 'Browser ' + platform.name + ' ' + platform.version + ' is not supported in OpenVidu'));
            }
        });
    };
    Session.prototype.disconnect = function () {
        this.leave(false, 'disconnect');
    };
    Session.prototype.subscribe = function (stream, targetElement, param3, param4) {
        var properties = {};
        if (!!param3 && typeof param3 !== 'function') {
            properties = {
                insertMode: (typeof param3.insertMode !== 'undefined') ? ((typeof param3.insertMode === 'string') ? VideoInsertMode_1.VideoInsertMode[param3.insertMode] : properties.insertMode) : VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: (typeof param3.subscribeToAudio !== 'undefined') ? param3.subscribeToAudio : true,
                subscribeToVideo: (typeof param3.subscribeToVideo !== 'undefined') ? param3.subscribeToVideo : true
            };
        }
        else {
            properties = {
                insertMode: VideoInsertMode_1.VideoInsertMode.APPEND,
                subscribeToAudio: true,
                subscribeToVideo: true
            };
        }
        var completionHandler;
        if (!!param3 && (typeof param3 === 'function')) {
            completionHandler = param3;
        }
        else if (!!param4) {
            completionHandler = param4;
        }
        console.info('Subscribing to ' + stream.connection.connectionId);
        stream.subscribe()
            .then(function () {
            console.info('Subscribed correctly to ' + stream.connection.connectionId);
            if (completionHandler !== undefined) {
                completionHandler(undefined);
            }
        })
            .catch(function (error) {
            if (completionHandler !== undefined) {
                completionHandler(error);
            }
        });
        var subscriber = new Subscriber_1.Subscriber(stream, targetElement, properties);
        stream.insertVideo(subscriber.element, properties.insertMode);
        return subscriber;
    };
    Session.prototype.subscribeAsync = function (stream, targetElement, properties) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var subscriber;
            var callback = function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve(subscriber);
                }
            };
            if (!!properties) {
                subscriber = _this.subscribe(stream, targetElement, properties, callback);
            }
            else {
                subscriber = _this.subscribe(stream, targetElement, callback);
            }
        });
    };
    Session.prototype.unsubscribe = function (subscriber) {
        var connectionId = subscriber.stream.connection.connectionId;
        console.info('Unsubscribing from ' + connectionId);
        this.openvidu.sendRequest('unsubscribeFromVideo', {
            sender: subscriber.stream.connection.connectionId
        }, function (error, response) {
            if (error) {
                console.error('Error unsubscribing from ' + connectionId, error);
            }
            else {
                console.info('Unsubscribed correctly from ' + connectionId);
            }
            subscriber.stream.disposeWebRtcPeer();
            subscriber.stream.disposeMediaStream();
        });
        subscriber.stream.removeVideo();
    };
    Session.prototype.publish = function (publisher) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            publisher.session = _this;
            publisher.stream.session = _this;
            if (!publisher.stream.isPublisherPublished) {
                _this.connection.addStream(publisher.stream);
                publisher.stream.publish()
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                publisher.initialize()
                    .then(function () {
                    _this.connection.addStream(publisher.stream);
                    publisher.stream.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });
            }
        });
    };
    Session.prototype.unpublish = function (publisher) {
        var stream = publisher.stream;
        if (!stream.connection) {
            console.error('The associated Connection object of this Publisher is null', stream);
            return;
        }
        else if (stream.connection !== this.connection) {
            console.error('The associated Connection object of this Publisher is not your local Connection.' +
                "Only moderators can force unpublish on remote Streams via 'forceUnpublish' method", stream);
            return;
        }
        else {
            console.info('Unpublishing local media (' + stream.connection.connectionId + ')');
            this.openvidu.sendRequest('unpublishVideo', function (error, response) {
                if (error) {
                    console.error(error);
                }
                else {
                    console.info('Media unpublished correctly');
                }
            });
            stream.disposeWebRtcPeer();
            delete stream.connection.stream;
            var streamEvent = new StreamEvent_1.StreamEvent(true, publisher, 'streamDestroyed', publisher.stream, 'unpublish');
            publisher.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
        }
    };
    Session.prototype.signal = function (signal) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var signalMessage = {};
            if (signal.to && signal.to.length > 0) {
                var connectionIds_1 = [];
                signal.to.forEach(function (connection) {
                    connectionIds_1.push(connection.connectionId);
                });
                signalMessage['to'] = connectionIds_1;
            }
            else {
                signalMessage['to'] = [];
            }
            signalMessage['data'] = signal.data ? signal.data : '';
            signalMessage['type'] = signal.type ? signal.type : '';
            _this.openvidu.sendRequest('sendMessage', {
                message: JSON.stringify(signalMessage)
            }, function (error, response) {
                if (!!error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    };
    Session.prototype.on = function (type, handler) {
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.once = function (type, handler) {
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Session'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Session'");
            }
            handler(event);
        });
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = true;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !str.speechEvent && str.hasAudio) {
                    str.enableOnceSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        if (type === 'publisherStartSpeaking' || type === 'publisherStopSpeaking') {
            this.speakingEventsEnabled = false;
            for (var connectionId in this.remoteConnections) {
                var str = this.remoteConnections[connectionId].stream;
                if (!!str && !!str.speechEvent) {
                    str.disableSpeakingEvents();
                }
            }
        }
        return this;
    };
    Session.prototype.onParticipantJoined = function (response) {
        var _this = this;
        this.getConnection(response.id, '')
            .then(function (connection) {
            console.warn('Connection ' + response.id + ' already exists in connections list');
        })
            .catch(function (openViduError) {
            var connection = new Connection_1.Connection(_this, response);
            _this.remoteConnections[response.id] = connection;
            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
        });
    };
    Session.prototype.onParticipantLeft = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, 'Remote connection ' + msg.name + " unknown when 'onParticipantLeft'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            if (!!connection.stream) {
                var stream = connection.stream;
                var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', stream, msg.reason);
                _this.ee.emitEvent('streamDestroyed', [streamEvent]);
                streamEvent.callDefaultBehaviour();
                delete _this.remoteStreamsCreated[stream.streamId];
            }
            delete _this.remoteConnections[connection.connectionId];
            _this.ee.emitEvent('connectionDestroyed', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionDestroyed', connection, msg.reason)]);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onParticipantPublished = function (response) {
        var _this = this;
        var afterConnectionFound = function (connection) {
            _this.remoteConnections[connection.connectionId] = connection;
            if (!_this.remoteStreamsCreated[connection.stream.streamId]) {
                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', connection.stream, '')]);
            }
            _this.remoteStreamsCreated[connection.stream.streamId] = true;
        };
        var connection;
        this.getRemoteConnection(response.id, "Remote connection '" + response.id + "' unknown when 'onParticipantPublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (con) {
            connection = con;
            response.metadata = con.data;
            connection.options = response;
            connection.initRemoteStreams(response.streams);
            afterConnectionFound(connection);
        })
            .catch(function (openViduError) {
            connection = new Connection_1.Connection(_this, response);
            afterConnectionFound(connection);
        });
    };
    Session.prototype.onParticipantUnpublished = function (msg) {
        var _this = this;
        this.getRemoteConnection(msg.name, "Remote connection '" + msg.name + "' unknown when 'onParticipantUnpublished'. " +
            'Existing remote connections: ' + JSON.stringify(Object.keys(this.remoteConnections)))
            .then(function (connection) {
            var streamEvent = new StreamEvent_1.StreamEvent(true, _this, 'streamDestroyed', connection.stream, msg.reason);
            _this.ee.emitEvent('streamDestroyed', [streamEvent]);
            streamEvent.callDefaultBehaviour();
            var streamId = connection.stream.streamId;
            delete _this.remoteStreamsCreated[streamId];
            connection.removeStream(streamId);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onParticipantEvicted = function (msg) {
    };
    Session.prototype.onNewMessage = function (msg) {
        var _this = this;
        console.info('New signal: ' + JSON.stringify(msg));
        this.getConnection(msg.from, "Connection '" + msg.from + "' unknow when 'onNewMessage'. Existing remote connections: "
            + JSON.stringify(Object.keys(this.remoteConnections)) + '. Existing local connection: ' + this.connection.connectionId)
            .then(function (connection) {
            _this.ee.emitEvent('signal', [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
            _this.ee.emitEvent('signal:' + msg.type, [new SignalEvent_1.SignalEvent(_this, msg.type, msg.data, connection)]);
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.recvIceCandidate = function (msg) {
        var candidate = {
            candidate: msg.candidate,
            sdpMid: msg.sdpMid,
            sdpMLineIndex: msg.sdpMLineIndex
        };
        this.getConnection(msg.endpointName, 'Connection not found for endpoint ' + msg.endpointName + '. Ice candidate will be ignored: ' + candidate)
            .then(function (connection) {
            var stream = connection.stream;
            stream.getWebRtcPeer().addIceCandidate(candidate, function (error) {
                if (error) {
                    console.error('Error adding candidate for ' + stream.streamId
                        + ' stream of endpoint ' + msg.endpointName + ': ' + error);
                }
            });
        })
            .catch(function (openViduError) {
            console.error(openViduError);
        });
    };
    Session.prototype.onSessionClosed = function (msg) {
        console.info('Session closed: ' + JSON.stringify(msg));
        var s = msg.room;
        if (s !== undefined) {
            this.ee.emitEvent('session-closed', [{
                    session: s
                }]);
        }
        else {
            console.warn('Session undefined on session closed', msg);
        }
    };
    Session.prototype.onLostConnection = function () {
        if (!this.connection) {
            console.warn('Not connected to session: if you are not debugging, this is probably a certificate error');
            var url = 'https://' + this.openvidu.getWsUri().split('wss://')[1].split('/openvidu')[0];
            if (window.confirm('If you are not debugging, this is probably a certificate error at \"' + url + '\"\n\nClick OK to navigate and accept it')) {
                location.assign(url + '/accept-certificate');
            }
            return;
        }
        console.warn('Lost connection in Session ' + this.sessionId);
        if (!!this.sessionId && !this.connection.disposed) {
            this.leave(true, 'networkDisconnect');
        }
    };
    Session.prototype.onMediaError = function (params) {
        console.error('Media error: ' + JSON.stringify(params));
        var err = params.error;
        if (err) {
            this.ee.emitEvent('error-media', [{
                    error: err
                }]);
        }
        else {
            console.warn('Received undefined media error. Params:', params);
        }
    };
    Session.prototype.onRecordingStarted = function (response) {
        this.ee.emitEvent('recordingStarted', [new RecordingEvent_1.RecordingEvent(this, 'recordingStarted', response.id, response.name)]);
    };
    Session.prototype.onRecordingStopped = function (response) {
        this.ee.emitEvent('recordingStopped', [new RecordingEvent_1.RecordingEvent(this, 'recordingStopped', response.id, response.name)]);
    };
    Session.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Session.prototype.leave = function (forced, reason) {
        var _this = this;
        forced = !!forced;
        console.info('Leaving Session (forced=' + forced + ')');
        if (!!this.connection) {
            if (!this.connection.disposed && !forced) {
                this.openvidu.sendRequest('leaveRoom', function (error, response) {
                    if (error) {
                        console.error(error);
                    }
                    _this.openvidu.closeWs();
                });
            }
            else {
                this.openvidu.closeWs();
            }
            if (!!this.connection.stream) {
                this.connection.stream.disposeWebRtcPeer();
                this.connection.stream.emitEvent('stream-destroyed-by-disconnect', [reason]);
            }
            if (!this.connection.disposed) {
                var sessionDisconnectEvent = new SessionDisconnectedEvent_1.SessionDisconnectedEvent(this, reason);
                this.ee.emitEvent('sessionDisconnected', [sessionDisconnectEvent]);
                sessionDisconnectEvent.callDefaultBehaviour();
            }
        }
        else {
            console.warn('You were not connected to the session ' + this.sessionId);
        }
    };
    Session.prototype.connectAux = function (token) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.openvidu.startWs(function (error) {
                if (!!error) {
                    reject(error);
                }
                else {
                    var joinParams = {
                        token: (!!token) ? token : '',
                        session: _this.sessionId,
                        metadata: !!_this.options.metadata ? _this.options.metadata : '',
                        secret: _this.openvidu.getSecret(),
                        recorder: _this.openvidu.getRecorder(),
                    };
                    _this.openvidu.sendRequest('joinRoom', joinParams, function (error, response) {
                        if (!!error) {
                            reject(error);
                        }
                        else {
                            _this.connection = new Connection_1.Connection(_this);
                            _this.connection.connectionId = response.id;
                            _this.connection.data = response.metadata;
                            var events_1 = {
                                connections: new Array(),
                                streams: new Array()
                            };
                            var existingParticipants = response.value;
                            existingParticipants.forEach(function (participant) {
                                var connection = new Connection_1.Connection(_this, participant);
                                _this.remoteConnections[connection.connectionId] = connection;
                                events_1.connections.push(connection);
                                if (!!connection.stream) {
                                    _this.remoteStreamsCreated[connection.stream.streamId] = true;
                                    events_1.streams.push(connection.stream);
                                }
                            });
                            _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', _this.connection, '')]);
                            events_1.connections.forEach(function (connection) {
                                _this.ee.emitEvent('connectionCreated', [new ConnectionEvent_1.ConnectionEvent(false, _this, 'connectionCreated', connection, '')]);
                            });
                            events_1.streams.forEach(function (stream) {
                                _this.ee.emitEvent('streamCreated', [new StreamEvent_1.StreamEvent(false, _this, 'streamCreated', stream, '')]);
                            });
                            resolve();
                        }
                    });
                }
            });
        });
    };
    Session.prototype.stringClientMetadata = function (metadata) {
        if (typeof metadata !== 'string') {
            return JSON.stringify(metadata);
        }
        else {
            return metadata;
        }
    };
    Session.prototype.getConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                if (_this.connection.connectionId === connectionId) {
                    resolve(_this.connection);
                }
                else {
                    reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
                }
            }
        });
    };
    Session.prototype.getRemoteConnection = function (connectionId, errorMessage) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var connection = _this.remoteConnections[connectionId];
            if (!!connection) {
                resolve(connection);
            }
            else {
                reject(new OpenViduError_1.OpenViduError(OpenViduError_1.OpenViduErrorName.GENERIC_ERROR, errorMessage));
            }
        });
    };
    Session.prototype.processToken = function (token) {
        var url = new URL(token);
        this.sessionId = url.searchParams.get('sessionId');
        var secret = url.searchParams.get('secret');
        var recorder = url.searchParams.get('recorder');
        if (!!secret) {
            this.openvidu.secret = secret;
        }
        if (!!recorder) {
            this.openvidu.recorder = true;
        }
        this.openvidu.wsUri = 'wss://' + url.host + '/openvidu';
    };
    return Session;
}());
exports.Session = Session;

},{"../OpenViduInternal/Enums/OpenViduError":35,"../OpenViduInternal/Enums/VideoInsertMode":36,"../OpenViduInternal/Events/ConnectionEvent":37,"../OpenViduInternal/Events/RecordingEvent":40,"../OpenViduInternal/Events/SessionDisconnectedEvent":41,"../OpenViduInternal/Events/SignalEvent":42,"../OpenViduInternal/Events/StreamEvent":43,"./Connection":27,"./Subscriber":33,"platform":9,"wolfy87-eventemitter":25}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var WebRtcStats_1 = require("../OpenViduInternal/WebRtcStats/WebRtcStats");
var PublisherSpeakingEvent_1 = require("../OpenViduInternal/Events/PublisherSpeakingEvent");
var EventEmitter = require("wolfy87-eventemitter");
var kurentoUtils = require("../OpenViduInternal/KurentoUtils/kurento-utils-js");
var VideoInsertMode_1 = require("../OpenViduInternal/Enums/VideoInsertMode");
var Stream = (function () {
    function Stream(session, options) {
        var _this = this;
        this.ee = new EventEmitter();
        this.isSubscribeToRemote = false;
        this.isReadyToPublish = false;
        this.isPublisherPublished = false;
        this.isVideoELementCreated = false;
        this.accessIsAllowed = false;
        this.accessIsDenied = false;
        this.session = session;
        if (options.hasOwnProperty('id')) {
            this.inboundStreamOpts = options;
            this.streamId = this.inboundStreamOpts.id;
            this.hasAudio = this.inboundStreamOpts.recvAudio;
            this.hasVideo = this.inboundStreamOpts.recvVideo;
            this.typeOfVideo = (!this.inboundStreamOpts.typeOfVideo) ? undefined : this.inboundStreamOpts.typeOfVideo;
            this.frameRate = (this.inboundStreamOpts.frameRate === -1) ? undefined : this.inboundStreamOpts.frameRate;
        }
        else {
            this.outboundStreamOpts = options;
            if (this.isSendVideo()) {
                if (this.isSendScreen()) {
                    this.streamId = 'SCREEN';
                    this.typeOfVideo = 'SCREEN';
                }
                else {
                    this.streamId = 'CAMERA';
                    this.typeOfVideo = 'CAMERA';
                }
                this.frameRate = this.outboundStreamOpts.publisherProperties.frameRate;
            }
            else {
                this.streamId = 'MICRO';
                delete this.typeOfVideo;
            }
            this.hasAudio = this.isSendAudio();
            this.hasVideo = this.isSendVideo();
        }
        this.on('mediastream-updated', function () {
            if (_this.video)
                _this.video.srcObject = _this.mediaStream;
            console.debug('Video srcObject [' + _this.mediaStream + '] updated in stream [' + _this.streamId + ']');
        });
    }
    Stream.prototype.getMediaStream = function () {
        return this.mediaStream;
    };
    Stream.prototype.setMediaStream = function (mediaStream) {
        this.mediaStream = mediaStream;
        this.ee.emitEvent('mediastream-updated');
    };
    Stream.prototype.getWebRtcPeer = function () {
        return this.webRtcPeer;
    };
    Stream.prototype.getRTCPeerConnection = function () {
        return this.webRtcPeer.peerConnection;
    };
    Stream.prototype.getVideoElement = function () {
        return this.video;
    };
    Stream.prototype.subscribeToMyRemote = function () {
        this.isSubscribeToRemote = true;
    };
    Stream.prototype.setOutboundStreamOptions = function (outboundStreamOpts) {
        this.outboundStreamOpts = outboundStreamOpts;
    };
    Stream.prototype.subscribe = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.initWebRtcPeerReceive()
                .then(function () {
                resolve();
            })
                .catch(function (error) {
                reject(error);
            });
        });
    };
    Stream.prototype.publish = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.isReadyToPublish) {
                _this.initWebRtcPeerSend()
                    .then(function () {
                    resolve();
                })
                    .catch(function (error) {
                    reject(error);
                });
            }
            else {
                _this.ee.once('stream-ready-to-publish', function (streamEvent) {
                    _this.publish()
                        .then(function () {
                        resolve();
                    })
                        .catch(function (error) {
                        reject(error);
                    });
                });
            }
        });
    };
    Stream.prototype.disposeWebRtcPeer = function () {
        if (this.webRtcPeer) {
            this.webRtcPeer.dispose();
        }
        if (this.speechEvent) {
            this.speechEvent.stop();
        }
        this.stopWebRtcStats();
        console.info((!!this.outboundStreamOpts ? 'Outbound ' : 'Inbound ') + "WebRTCPeer from 'Stream' with id [" + this.streamId + '] is now closed');
    };
    Stream.prototype.disposeMediaStream = function () {
        if (this.mediaStream) {
            this.mediaStream.getAudioTracks().forEach(function (track) {
                track.stop();
            });
            this.mediaStream.getVideoTracks().forEach(function (track) {
                track.stop();
            });
        }
        console.info((!!this.outboundStreamOpts ? 'Local ' : 'Remote ') + "MediaStream from 'Stream' with id [" + this.streamId + '] is now disposed');
    };
    Stream.prototype.displayMyRemote = function () {
        return this.isSubscribeToRemote;
    };
    Stream.prototype.on = function (eventName, listener) {
        this.ee.on(eventName, listener);
    };
    Stream.prototype.once = function (eventName, listener) {
        this.ee.once(eventName, listener);
    };
    Stream.prototype.insertVideo = function (targetElement, insertMode) {
        var _this = this;
        if (!!targetElement) {
            this.video = document.createElement('video');
            this.video.id = (this.isLocal() ? 'local-' : 'remote-') + 'video-' + this.streamId;
            this.video.autoplay = true;
            this.video.controls = false;
            this.video.srcObject = this.mediaStream;
            if (this.isLocal() && !this.displayMyRemote()) {
                this.video.muted = true;
                if (this.outboundStreamOpts.publisherProperties.mirror) {
                    this.mirrorVideo(this.video);
                }
                this.video.oncanplay = function () {
                    console.info("Local 'Stream' with id [" + _this.streamId + '] video is now playing');
                    _this.ee.emitEvent('video-is-playing', [{
                            element: _this.video
                        }]);
                };
            }
            else {
                this.video.title = this.streamId;
            }
            this.targetElement = targetElement;
            this.parentId = targetElement.id;
            var insMode = !!insertMode ? insertMode : VideoInsertMode_1.VideoInsertMode.APPEND;
            this.insertElementWithMode(this.video, insMode);
            this.ee.emitEvent('video-element-created-by-stream', [{
                    element: this.video
                }]);
            this.isVideoELementCreated = true;
        }
        this.isReadyToPublish = true;
        this.ee.emitEvent('stream-ready-to-publish');
        return this.video;
    };
    Stream.prototype.removeVideo = function () {
        if (this.video) {
            if (document.getElementById(this.parentId)) {
                document.getElementById(this.parentId).removeChild(this.video);
                this.ee.emitEvent('video-removed', [this.video]);
            }
            delete this.video;
        }
    };
    Stream.prototype.isSendAudio = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.audioSource !== null &&
            this.outboundStreamOpts.publisherProperties.audioSource !== false);
    };
    Stream.prototype.isSendVideo = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource !== null &&
            this.outboundStreamOpts.publisherProperties.videoSource !== false);
    };
    Stream.prototype.isSendScreen = function () {
        return (!!this.outboundStreamOpts &&
            this.outboundStreamOpts.publisherProperties.videoSource === 'screen');
    };
    Stream.prototype.emitEvent = function (type, eventArray) {
        this.ee.emitEvent(type, eventArray);
    };
    Stream.prototype.setSpeechEventIfNotExists = function () {
        if (!this.speechEvent) {
            var harkOptions = this.session.openvidu.advancedConfiguration.publisherSpeakingEventsOptions || {};
            harkOptions.interval = (typeof harkOptions.interval === 'number') ? harkOptions.interval : 50;
            harkOptions.threshold = (typeof harkOptions.threshold === 'number') ? harkOptions.threshold : -50;
            this.speechEvent = kurentoUtils.WebRtcPeer.hark(this.mediaStream, harkOptions);
        }
    };
    Stream.prototype.enableSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
        });
    };
    Stream.prototype.enableOnceSpeakingEvents = function () {
        var _this = this;
        this.setSpeechEventIfNotExists();
        this.speechEvent.on('speaking', function () {
            _this.session.emitEvent('publisherStartSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStartSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
        this.speechEvent.on('stopped_speaking', function () {
            _this.session.emitEvent('publisherStopSpeaking', [new PublisherSpeakingEvent_1.PublisherSpeakingEvent(_this.session, 'publisherStopSpeaking', _this.connection, _this.streamId)]);
            _this.disableSpeakingEvents();
        });
    };
    Stream.prototype.disableSpeakingEvents = function () {
        this.speechEvent.stop();
        this.speechEvent = undefined;
    };
    Stream.prototype.initWebRtcPeerSend = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var userMediaConstraints = {
                audio: _this.isSendAudio(),
                video: _this.isSendVideo()
            };
            var options = {
                videoStream: _this.mediaStream,
                mediaConstraints: userMediaConstraints,
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                iceServers: _this.session.openvidu.advancedConfiguration.iceServers
            };
            var successCallback = function (error, sdpOfferParam, wp) {
                if (error) {
                    reject(new Error('(publish) SDP offer error: ' + JSON.stringify(error)));
                }
                console.debug('Sending SDP offer to publish as '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('publishVideo', {
                    sdpOffer: sdpOfferParam,
                    doLoopback: _this.displayMyRemote() || false,
                    audioActive: _this.isSendAudio(),
                    videoActive: _this.isSendVideo(),
                    typeOfVideo: ((_this.isSendVideo()) ? (_this.isSendScreen() ? 'SCREEN' : 'CAMERA') : ''),
                    frameRate: !!_this.frameRate ? _this.frameRate : -1
                }, function (error, response) {
                    if (error) {
                        reject('Error on publishVideo: ' + JSON.stringify(error));
                    }
                    else {
                        _this.processSdpAnswer(response.sdpAnswer)
                            .then(function () {
                            _this.ee.emitEvent('stream-created-by-publisher');
                            resolve();
                        })
                            .catch(function (error) {
                            reject(error);
                        });
                        console.info("'Publisher' successfully published to session");
                    }
                });
            };
            if (_this.displayMyRemote()) {
                _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options, function (err) {
                    if (err) {
                        reject(err);
                    }
                    _this.webRtcPeer.generateOffer(successCallback);
                });
            }
            else {
                _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
                    if (error) {
                        reject(error);
                    }
                    _this.webRtcPeer.generateOffer(successCallback);
                });
            }
            _this.isPublisherPublished = true;
        });
    };
    Stream.prototype.initWebRtcPeerReceive = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var offerConstraints = {
                audio: _this.inboundStreamOpts.recvAudio,
                video: _this.inboundStreamOpts.recvVideo
            };
            console.debug("'Session.subscribe(Stream)' called. Constraints of generate SDP offer", offerConstraints);
            var options = {
                onicecandidate: _this.connection.sendIceCandidate.bind(_this.connection),
                mediaConstraints: offerConstraints
            };
            var successCallback = function (error, sdpOfferParam, wp) {
                if (error) {
                    reject(new Error('(subscribe) SDP offer error: ' + JSON.stringify(error)));
                }
                console.debug('Sending SDP offer to subscribe to '
                    + _this.streamId, sdpOfferParam);
                _this.session.openvidu.sendRequest('receiveVideoFrom', {
                    sender: _this.streamId,
                    sdpOffer: sdpOfferParam
                }, function (error, response) {
                    if (error) {
                        reject(new Error('Error on recvVideoFrom: ' + JSON.stringify(error)));
                    }
                    else {
                        _this.processSdpAnswer(response.sdpAnswer).then(function () {
                            resolve();
                        }).catch(function (error) {
                            reject(error);
                        });
                    }
                });
            };
            _this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) {
                    reject(error);
                }
                _this.webRtcPeer.generateOffer(successCallback);
            });
        });
    };
    Stream.prototype.processSdpAnswer = function (sdpAnswer) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var answer = new RTCSessionDescription({
                type: 'answer',
                sdp: sdpAnswer,
            });
            console.debug(_this.streamId + ': set peer connection with recvd SDP answer', sdpAnswer);
            var streamId = _this.streamId;
            var peerConnection = _this.webRtcPeer.peerConnection;
            peerConnection.setRemoteDescription(answer, function () {
                if (!_this.isLocal() || _this.displayMyRemote()) {
                    _this.mediaStream = peerConnection.getRemoteStreams()[0];
                    console.debug('Peer remote stream', _this.mediaStream);
                    if (!!_this.mediaStream) {
                        _this.ee.emitEvent('mediastream-updated');
                        if (!!_this.mediaStream.getAudioTracks()[0] && _this.session.speakingEventsEnabled) {
                            _this.enableSpeakingEvents();
                        }
                    }
                    if (!!_this.video) {
                        _this.video.oncanplay = function () {
                            if (_this.isLocal() && _this.displayMyRemote()) {
                                console.info("Your own remote 'Stream' with id [" + _this.streamId + '] video is now playing');
                                _this.ee.emitEvent('remote-video-is-playing', [{
                                        element: _this.video
                                    }]);
                            }
                            else if (!_this.isLocal() && !_this.displayMyRemote()) {
                                console.info("Remote 'Stream' with id [" + _this.streamId + '] video is now playing');
                                _this.ee.emitEvent('video-is-playing', [{
                                        element: _this.video
                                    }]);
                            }
                        };
                    }
                    _this.session.emitEvent('stream-subscribed', [{
                            stream: _this
                        }]);
                }
                _this.initWebRtcStats();
                resolve();
            }, function (error) {
                reject(new Error(_this.streamId + ': Error setting SDP to the peer connection: ' + JSON.stringify(error)));
            });
        });
    };
    Stream.prototype.initWebRtcStats = function () {
        this.webRtcStats = new WebRtcStats_1.WebRtcStats(this);
        this.webRtcStats.initWebRtcStats();
    };
    Stream.prototype.stopWebRtcStats = function () {
        if (!!this.webRtcStats && this.webRtcStats.isEnabled()) {
            this.webRtcStats.stopWebRtcStats();
        }
    };
    Stream.prototype.isLocal = function () {
        return (!this.inboundStreamOpts && !!this.outboundStreamOpts);
    };
    Stream.prototype.insertElementWithMode = function (element, insertMode) {
        if (!!this.targetElement) {
            switch (insertMode) {
                case VideoInsertMode_1.VideoInsertMode.AFTER:
                    this.targetElement.parentNode.insertBefore(element, this.targetElement.nextSibling);
                    break;
                case VideoInsertMode_1.VideoInsertMode.APPEND:
                    this.targetElement.appendChild(element);
                    break;
                case VideoInsertMode_1.VideoInsertMode.BEFORE:
                    this.targetElement.parentNode.insertBefore(element, this.targetElement);
                    break;
                case VideoInsertMode_1.VideoInsertMode.PREPEND:
                    this.targetElement.insertBefore(element, this.targetElement.childNodes[0]);
                    break;
                case VideoInsertMode_1.VideoInsertMode.REPLACE:
                    this.targetElement.parentNode.replaceChild(element, this.targetElement);
                    break;
                default:
                    this.insertElementWithMode(element, VideoInsertMode_1.VideoInsertMode.APPEND);
            }
        }
    };
    Stream.prototype.mirrorVideo = function (video) {
        video.style.transform = 'rotateY(180deg)';
        video.style.webkitTransform = 'rotateY(180deg)';
    };
    return Stream;
}());
exports.Stream = Stream;

},{"../OpenViduInternal/Enums/VideoInsertMode":36,"../OpenViduInternal/Events/PublisherSpeakingEvent":39,"../OpenViduInternal/KurentoUtils/kurento-utils-js":55,"../OpenViduInternal/WebRtcStats/WebRtcStats":58,"wolfy87-eventemitter":25}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var VideoElementEvent_1 = require("../OpenViduInternal/Events/VideoElementEvent");
var EventEmitter = require("wolfy87-eventemitter");
var Subscriber = (function () {
    function Subscriber(stream, targetElement, properties) {
        var _this = this;
        this.ee = new EventEmitter();
        this.stream = stream;
        this.properties = properties;
        if (typeof targetElement === 'string') {
            var e = document.getElementById(targetElement);
            if (!!e) {
                this.element = e;
            }
        }
        else if (targetElement instanceof HTMLElement) {
            this.element = targetElement;
        }
        this.stream.once('video-removed', function (element) {
            _this.ee.emitEvent('videoElementDestroyed', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementDestroyed')]);
        });
    }
    Subscriber.prototype.subscribeToAudio = function (value) {
        this.stream.getWebRtcPeer().audioEnabled = value;
        console.info("'Subscriber' has " + (value ? 'subscribed' : 'unsubscribed') + ' to its audio stream');
        return this;
    };
    Subscriber.prototype.subscribeToVideo = function (value) {
        this.stream.getWebRtcPeer().videoEnabled = value;
        console.info("'Subscriber' has " + (value ? 'subscribed' : 'unsubscribed') + ' to its video stream');
        return this;
    };
    Subscriber.prototype.on = function (type, handler) {
        var _this = this;
        this.ee.on(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered by 'Subscriber'", event);
            }
            else {
                console.info("Event '" + type + "' triggered by 'Subscriber'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        return this;
    };
    Subscriber.prototype.once = function (type, handler) {
        var _this = this;
        this.ee.once(type, function (event) {
            if (event) {
                console.info("Event '" + type + "' triggered once by 'Subscriber'", event);
            }
            else {
                console.info("Event '" + type + "' triggered once by 'Subscriber'");
            }
            handler(event);
        });
        if (type === 'videoElementCreated') {
            if (this.stream.isVideoELementCreated) {
                this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoElementCreated')]);
            }
            else {
                this.stream.once('video-element-created-by-stream', function (element) {
                    _this.id = element.id;
                    _this.ee.emitEvent('videoElementCreated', [new VideoElementEvent_1.VideoElementEvent(element, _this, 'videoElementCreated')]);
                });
            }
        }
        if (type === 'videoPlaying') {
            var video = this.stream.getVideoElement();
            if (!this.stream.displayMyRemote() && video &&
                video.currentTime > 0 &&
                video.paused === false &&
                video.ended === false &&
                video.readyState === 4) {
                this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(this.stream.getVideoElement(), this, 'videoPlaying')]);
            }
            else {
                this.stream.once('video-is-playing', function (element) {
                    _this.ee.emitEvent('videoPlaying', [new VideoElementEvent_1.VideoElementEvent(element.element, _this, 'videoPlaying')]);
                });
            }
        }
        return this;
    };
    Subscriber.prototype.off = function (type, handler) {
        if (!handler) {
            this.ee.removeAllListeners(type);
        }
        else {
            this.ee.off(type, handler);
        }
        return this;
    };
    return Subscriber;
}());
exports.Subscriber = Subscriber;

},{"../OpenViduInternal/Events/VideoElementEvent":44,"wolfy87-eventemitter":25}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var LocalRecorderState;
(function (LocalRecorderState) {
    LocalRecorderState["READY"] = "READY";
    LocalRecorderState["RECORDING"] = "RECORDING";
    LocalRecorderState["PAUSED"] = "PAUSED";
    LocalRecorderState["FINISHED"] = "FINISHED";
})(LocalRecorderState = exports.LocalRecorderState || (exports.LocalRecorderState = {}));

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var OpenViduErrorName;
(function (OpenViduErrorName) {
    OpenViduErrorName["BROWSER_NOT_SUPPORTED"] = "BROWSER_NOT_SUPPORTED";
    OpenViduErrorName["CAMERA_ACCESS_DENIED"] = "CAMERA_ACCESS_DENIED";
    OpenViduErrorName["MICROPHONE_ACCESS_DENIED"] = "MICROPHONE_ACCESS_DENIED";
    OpenViduErrorName["SCREEN_CAPTURE_DENIED"] = "SCREEN_CAPTURE_DENIED";
    OpenViduErrorName["SCREEN_SHARING_NOT_SUPPORTED"] = "SCREEN_SHARING_NOT_SUPPORTED";
    OpenViduErrorName["SCREEN_EXTENSION_NOT_INSTALLED"] = "SCREEN_EXTENSION_NOT_INSTALLED";
    OpenViduErrorName["SCREEN_EXTENSION_DISABLED"] = "SCREEN_EXTENSION_DISABLED";
    OpenViduErrorName["INPUT_VIDEO_DEVICE_NOT_FOUND"] = "INPUT_VIDEO_DEVICE_NOT_FOUND";
    OpenViduErrorName["INPUT_AUDIO_DEVICE_NOT_FOUND"] = "INPUT_AUDIO_DEVICE_NOT_FOUND";
    OpenViduErrorName["NO_INPUT_SOURCE_SET"] = "NO_INPUT_SOURCE_SET";
    OpenViduErrorName["PUBLISHER_PROPERTIES_ERROR"] = "PUBLISHER_PROPERTIES_ERROR";
    OpenViduErrorName["OPENVIDU_PERMISSION_DENIED"] = "OPENVIDU_PERMISSION_DENIED";
    OpenViduErrorName["OPENVIDU_NOT_CONNECTED"] = "OPENVIDU_NOT_CONNECTED";
    OpenViduErrorName["GENERIC_ERROR"] = "GENERIC_ERROR";
})(OpenViduErrorName = exports.OpenViduErrorName || (exports.OpenViduErrorName = {}));
var OpenViduError = (function () {
    function OpenViduError(name, message) {
        this.name = name;
        this.message = message;
    }
    return OpenViduError;
}());
exports.OpenViduError = OpenViduError;

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var VideoInsertMode;
(function (VideoInsertMode) {
    VideoInsertMode["AFTER"] = "AFTER";
    VideoInsertMode["APPEND"] = "APPEND";
    VideoInsertMode["BEFORE"] = "BEFORE";
    VideoInsertMode["PREPEND"] = "PREPEND";
    VideoInsertMode["REPLACE"] = "REPLACE";
})(VideoInsertMode = exports.VideoInsertMode || (exports.VideoInsertMode = {}));

},{}],37:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var ConnectionEvent = (function (_super) {
    __extends(ConnectionEvent, _super);
    function ConnectionEvent(cancelable, target, type, connection, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.connection = connection;
        _this.reason = reason;
        return _this;
    }
    ConnectionEvent.prototype.callDefaultBehaviour = function () { };
    return ConnectionEvent;
}(Event_1.Event));
exports.ConnectionEvent = ConnectionEvent;

},{"./Event":38}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Event = (function () {
    function Event(cancelable, target, type) {
        this.hasBeenPrevented = false;
        this.cancelable = cancelable;
        this.target = target;
        this.type = type;
    }
    Event.prototype.isDefaultPrevented = function () {
        return this.hasBeenPrevented;
    };
    Event.prototype.preventDefault = function () {
        this.callDefaultBehaviour = function () { };
        this.hasBeenPrevented = true;
    };
    return Event;
}());
exports.Event = Event;

},{}],39:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var PublisherSpeakingEvent = (function (_super) {
    __extends(PublisherSpeakingEvent, _super);
    function PublisherSpeakingEvent(target, type, connection, streamId) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.connection = connection;
        _this.streamId = streamId;
        return _this;
    }
    PublisherSpeakingEvent.prototype.callDefaultBehaviour = function () { };
    return PublisherSpeakingEvent;
}(Event_1.Event));
exports.PublisherSpeakingEvent = PublisherSpeakingEvent;

},{"./Event":38}],40:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var RecordingEvent = (function (_super) {
    __extends(RecordingEvent, _super);
    function RecordingEvent(target, type, id, name) {
        var _this = _super.call(this, false, target, type) || this;
        _this.id = id;
        if (name !== id) {
            _this.name = name;
        }
        return _this;
    }
    RecordingEvent.prototype.callDefaultBehaviour = function () { };
    return RecordingEvent;
}(Event_1.Event));
exports.RecordingEvent = RecordingEvent;

},{"./Event":38}],41:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var SessionDisconnectedEvent = (function (_super) {
    __extends(SessionDisconnectedEvent, _super);
    function SessionDisconnectedEvent(target, reason) {
        var _this = _super.call(this, true, target, 'sessionDisconnected') || this;
        _this.reason = reason;
        return _this;
    }
    SessionDisconnectedEvent.prototype.callDefaultBehaviour = function () {
        console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");
        var session = this.target;
        for (var connectionId in session.remoteConnections) {
            if (!!session.remoteConnections[connectionId].stream) {
                session.remoteConnections[connectionId].stream.disposeWebRtcPeer();
                session.remoteConnections[connectionId].stream.disposeMediaStream();
                session.remoteConnections[connectionId].stream.removeVideo();
                delete session.remoteStreamsCreated[session.remoteConnections[connectionId].stream.streamId];
                session.remoteConnections[connectionId].dispose();
            }
            delete session.remoteConnections[connectionId];
        }
    };
    return SessionDisconnectedEvent;
}(Event_1.Event));
exports.SessionDisconnectedEvent = SessionDisconnectedEvent;

},{"./Event":38}],42:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var SignalEvent = (function (_super) {
    __extends(SignalEvent, _super);
    function SignalEvent(target, type, data, from) {
        var _this = _super.call(this, false, target, type) || this;
        _this.type = type;
        _this.data = data;
        _this.from = from;
        return _this;
    }
    SignalEvent.prototype.callDefaultBehaviour = function () { };
    return SignalEvent;
}(Event_1.Event));
exports.SignalEvent = SignalEvent;

},{"./Event":38}],43:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var Publisher_1 = require("../../OpenVidu/Publisher");
var Session_1 = require("../../OpenVidu/Session");
var StreamEvent = (function (_super) {
    __extends(StreamEvent, _super);
    function StreamEvent(cancelable, target, type, stream, reason) {
        var _this = _super.call(this, cancelable, target, type) || this;
        _this.stream = stream;
        _this.reason = reason;
        return _this;
    }
    StreamEvent.prototype.callDefaultBehaviour = function () {
        if (this.type === 'streamDestroyed') {
            if (this.target instanceof Session_1.Session) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Session'");
                this.stream.disposeWebRtcPeer();
                this.stream.disposeMediaStream();
                this.stream.removeVideo();
            }
            else if (this.target instanceof Publisher_1.Publisher) {
                console.info("Calling default behaviour upon '" + this.type + "' event dispatched by 'Publisher'");
                this.stream.disposeMediaStream();
                this.stream.removeVideo();
                this.stream.isReadyToPublish = false;
            }
            delete this.stream.session.remoteStreamsCreated[this.stream.streamId];
            var remoteConnection = this.stream.session.remoteConnections[this.stream.connection.connectionId];
            if (!!remoteConnection && !!remoteConnection.options) {
                var streamOptionsServer = remoteConnection.options.streams;
                for (var i = streamOptionsServer.length - 1; i >= 0; --i) {
                    if (streamOptionsServer[i].id === this.stream.streamId) {
                        streamOptionsServer.splice(i, 1);
                    }
                }
            }
        }
    };
    return StreamEvent;
}(Event_1.Event));
exports.StreamEvent = StreamEvent;

},{"../../OpenVidu/Publisher":30,"../../OpenVidu/Session":31,"./Event":38}],44:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Event_1 = require("./Event");
var VideoElementEvent = (function (_super) {
    __extends(VideoElementEvent, _super);
    function VideoElementEvent(element, target, type) {
        var _this = _super.call(this, false, target, type) || this;
        _this.element = element;
        return _this;
    }
    VideoElementEvent.prototype.callDefaultBehaviour = function () { };
    return VideoElementEvent;
}(Event_1.Event));
exports.VideoElementEvent = VideoElementEvent;

},{"./Event":38}],45:[function(require,module,exports){
function Mapper() {
    var sources = {};
    this.forEach = function (callback) {
        for (var key in sources) {
            var source = sources[key];
            for (var key2 in source)
                callback(source[key2]);
        }
        ;
    };
    this.get = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return undefined;
        return ids[id];
    };
    this.remove = function (id, source) {
        var ids = sources[source];
        if (ids == undefined)
            return;
        delete ids[id];
        for (var i in ids) {
            return false;
        }
        delete sources[source];
    };
    this.set = function (value, id, source) {
        if (value == undefined)
            return this.remove(id, source);
        var ids = sources[source];
        if (ids == undefined)
            sources[source] = ids = {};
        ids[id] = value;
    };
}
;
Mapper.prototype.pop = function (id, source) {
    var value = this.get(id, source);
    if (value == undefined)
        return undefined;
    this.remove(id, source);
    return value;
};
module.exports = Mapper;

},{}],46:[function(require,module,exports){
var JsonRpcClient = require('./jsonrpcclient');
exports.JsonRpcClient = JsonRpcClient;

},{"./jsonrpcclient":47}],47:[function(require,module,exports){
var RpcBuilder = require('../');
var WebSocketWithReconnection = require('./transports/webSocketWithReconnection');
Date.now = Date.now || function () {
    return +new Date;
};
var PING_INTERVAL = 5000;
var RECONNECTING = 'RECONNECTING';
var CONNECTED = 'CONNECTED';
var DISCONNECTED = 'DISCONNECTED';
var Logger = console;
function JsonRpcClient(configuration) {
    var self = this;
    var wsConfig = configuration.ws;
    var notReconnectIfNumLessThan = -1;
    var pingNextNum = 0;
    var enabledPings = true;
    var pingPongStarted = false;
    var pingInterval;
    var status = DISCONNECTED;
    var onreconnecting = wsConfig.onreconnecting;
    var onreconnected = wsConfig.onreconnected;
    var onconnected = wsConfig.onconnected;
    var onerror = wsConfig.onerror;
    configuration.rpc.pull = function (params, request) {
        request.reply(null, "push");
    };
    wsConfig.onreconnecting = function () {
        Logger.debug("--------- ONRECONNECTING -----------");
        if (status === RECONNECTING) {
            Logger.error("Websocket already in RECONNECTING state when receiving a new ONRECONNECTING message. Ignoring it");
            return;
        }
        status = RECONNECTING;
        if (onreconnecting) {
            onreconnecting();
        }
    };
    wsConfig.onreconnected = function () {
        Logger.debug("--------- ONRECONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONRECONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        updateNotReconnectIfLessThan();
        usePing();
        if (onreconnected) {
            onreconnected();
        }
    };
    wsConfig.onconnected = function () {
        Logger.debug("--------- ONCONNECTED -----------");
        if (status === CONNECTED) {
            Logger.error("Websocket already in CONNECTED state when receiving a new ONCONNECTED message. Ignoring it");
            return;
        }
        status = CONNECTED;
        enabledPings = true;
        usePing();
        if (onconnected) {
            onconnected();
        }
    };
    wsConfig.onerror = function (error) {
        Logger.debug("--------- ONERROR -----------");
        status = DISCONNECTED;
        if (onerror) {
            onerror(error);
        }
    };
    var ws = new WebSocketWithReconnection(wsConfig);
    Logger.debug('Connecting websocket to URI: ' + wsConfig.uri);
    var rpcBuilderOptions = {
        request_timeout: configuration.rpc.requestTimeout,
        ping_request_timeout: configuration.rpc.heartbeatRequestTimeout
    };
    var rpc = new RpcBuilder(RpcBuilder.packers.JsonRPC, rpcBuilderOptions, ws, function (request) {
        Logger.debug('Received request: ' + JSON.stringify(request));
        try {
            var func = configuration.rpc[request.method];
            if (func === undefined) {
                Logger.error("Method " + request.method + " not registered in client");
            }
            else {
                func(request.params, request);
            }
        }
        catch (err) {
            Logger.error('Exception processing request: ' + JSON.stringify(request));
            Logger.error(err);
        }
    });
    this.send = function (method, params, callback) {
        if (method !== 'ping') {
            Logger.debug('Request: method:' + method + " params:" + JSON.stringify(params));
        }
        var requestTime = Date.now();
        rpc.encode(method, params, function (error, result) {
            if (error) {
                try {
                    Logger.error("ERROR:" + error.message + " in Request: method:" +
                        method + " params:" + JSON.stringify(params) + " request:" +
                        error.request);
                    if (error.data) {
                        Logger.error("ERROR DATA:" + JSON.stringify(error.data));
                    }
                }
                catch (e) { }
                error.requestTime = requestTime;
            }
            if (callback) {
                if (result != undefined && result.value !== 'pong') {
                    Logger.debug('Response: ' + JSON.stringify(result));
                }
                callback(error, result);
            }
        });
    };
    function updateNotReconnectIfLessThan() {
        Logger.debug("notReconnectIfNumLessThan = " + pingNextNum + ' (old=' +
            notReconnectIfNumLessThan + ')');
        notReconnectIfNumLessThan = pingNextNum;
    }
    function sendPing() {
        if (enabledPings) {
            var params = null;
            if (pingNextNum == 0 || pingNextNum == notReconnectIfNumLessThan) {
                params = {
                    interval: configuration.heartbeat || PING_INTERVAL
                };
            }
            pingNextNum++;
            self.send('ping', params, (function (pingNum) {
                return function (error, result) {
                    if (error) {
                        Logger.debug("Error in ping request #" + pingNum + " (" +
                            error.message + ")");
                        if (pingNum > notReconnectIfNumLessThan) {
                            enabledPings = false;
                            updateNotReconnectIfLessThan();
                            Logger.debug("Server did not respond to ping message #" +
                                pingNum + ". Reconnecting... ");
                            ws.reconnectWs();
                        }
                    }
                };
            })(pingNextNum));
        }
        else {
            Logger.debug("Trying to send ping, but ping is not enabled");
        }
    }
    function usePing() {
        if (!pingPongStarted) {
            Logger.debug("Starting ping (if configured)");
            pingPongStarted = true;
            if (configuration.heartbeat != undefined) {
                pingInterval = setInterval(sendPing, configuration.heartbeat);
                sendPing();
            }
        }
    }
    this.close = function () {
        Logger.debug("Closing jsonRpcClient explicitly by client");
        if (pingInterval != undefined) {
            Logger.debug("Clearing ping interval");
            clearInterval(pingInterval);
        }
        pingPongStarted = false;
        enabledPings = false;
        if (configuration.sendCloseMessage) {
            Logger.debug("Sending close message");
            this.send('closeSession', null, function (error, result) {
                if (error) {
                    Logger.error("Error sending close message: " + JSON.stringify(error));
                }
                ws.close();
            });
        }
        else {
            ws.close();
        }
    };
    this.forceClose = function (millis) {
        ws.forceClose(millis);
    };
    this.reconnect = function () {
        ws.reconnectWs();
    };
}
module.exports = JsonRpcClient;

},{"../":50,"./transports/webSocketWithReconnection":49}],48:[function(require,module,exports){
var WebSocketWithReconnection = require('./webSocketWithReconnection');
exports.WebSocketWithReconnection = WebSocketWithReconnection;

},{"./webSocketWithReconnection":49}],49:[function(require,module,exports){
(function (global){
"use strict";
var BrowserWebSocket = global.WebSocket || global.MozWebSocket;
var Logger = console;
var MAX_RETRIES = 2000;
var RETRY_TIME_MS = 3000;
var CONNECTING = 0;
var OPEN = 1;
var CLOSING = 2;
var CLOSED = 3;
function WebSocketWithReconnection(config) {
    var closing = false;
    var registerMessageHandler;
    var wsUri = config.uri;
    var useSockJS = config.useSockJS;
    var reconnecting = false;
    var forcingDisconnection = false;
    var ws;
    if (useSockJS) {
        ws = new SockJS(wsUri);
    }
    else {
        ws = new WebSocket(wsUri);
    }
    ws.onopen = function () {
        logConnected(ws, wsUri);
        if (config.onconnected) {
            config.onconnected();
        }
    };
    ws.onerror = function (error) {
        Logger.error("Could not connect to " + wsUri + " (invoking onerror if defined)", error);
        if (config.onerror) {
            config.onerror(error);
        }
    };
    function logConnected(ws, wsUri) {
        try {
            Logger.debug("WebSocket connected to " + wsUri);
        }
        catch (e) {
            Logger.error(e);
        }
    }
    var reconnectionOnClose = function () {
        if (ws.readyState === CLOSED) {
            if (closing) {
                Logger.debug("Connection closed by user");
            }
            else {
                Logger.debug("Connection closed unexpectecly. Reconnecting...");
                reconnectToSameUri(MAX_RETRIES, 1);
            }
        }
        else {
            Logger.debug("Close callback from previous websocket. Ignoring it");
        }
    };
    ws.onclose = reconnectionOnClose;
    function reconnectToSameUri(maxRetries, numRetries) {
        Logger.debug("reconnectToSameUri (attempt #" + numRetries + ", max=" + maxRetries + ")");
        if (numRetries === 1) {
            if (reconnecting) {
                Logger.warn("Trying to reconnectToNewUri when reconnecting... Ignoring this reconnection.");
                return;
            }
            else {
                reconnecting = true;
            }
            if (config.onreconnecting) {
                config.onreconnecting();
            }
        }
        if (forcingDisconnection) {
            reconnectToNewUri(maxRetries, numRetries, wsUri);
        }
        else {
            if (config.newWsUriOnReconnection) {
                config.newWsUriOnReconnection(function (error, newWsUri) {
                    if (error) {
                        Logger.debug(error);
                        setTimeout(function () {
                            reconnectToSameUri(maxRetries, numRetries + 1);
                        }, RETRY_TIME_MS);
                    }
                    else {
                        reconnectToNewUri(maxRetries, numRetries, newWsUri);
                    }
                });
            }
            else {
                reconnectToNewUri(maxRetries, numRetries, wsUri);
            }
        }
    }
    function reconnectToNewUri(maxRetries, numRetries, reconnectWsUri) {
        Logger.debug("Reconnection attempt #" + numRetries);
        ws.close();
        wsUri = reconnectWsUri || wsUri;
        var newWs;
        if (useSockJS) {
            newWs = new SockJS(wsUri);
        }
        else {
            newWs = new WebSocket(wsUri);
        }
        newWs.onopen = function () {
            Logger.debug("Reconnected after " + numRetries + " attempts...");
            logConnected(newWs, wsUri);
            reconnecting = false;
            registerMessageHandler();
            if (config.onreconnected()) {
                config.onreconnected();
            }
            newWs.onclose = reconnectionOnClose;
        };
        var onErrorOrClose = function (error) {
            Logger.warn("Reconnection error: ", error);
            if (numRetries === maxRetries) {
                if (config.ondisconnect) {
                    config.ondisconnect();
                }
            }
            else {
                setTimeout(function () {
                    reconnectToSameUri(maxRetries, numRetries + 1);
                }, RETRY_TIME_MS);
            }
        };
        newWs.onerror = onErrorOrClose;
        ws = newWs;
    }
    this.close = function () {
        closing = true;
        ws.close();
    };
    this.forceClose = function (millis) {
        Logger.debug("Testing: Force WebSocket close");
        if (millis) {
            Logger.debug("Testing: Change wsUri for " + millis + " millis to simulate net failure");
            var goodWsUri = wsUri;
            wsUri = "wss://21.234.12.34.4:443/";
            forcingDisconnection = true;
            setTimeout(function () {
                Logger.debug("Testing: Recover good wsUri " + goodWsUri);
                wsUri = goodWsUri;
                forcingDisconnection = false;
            }, millis);
        }
        ws.close();
    };
    this.reconnectWs = function () {
        Logger.debug("reconnectWs");
        reconnectToSameUri(MAX_RETRIES, 1, wsUri);
    };
    this.send = function (message) {
        ws.send(message);
    };
    this.addEventListener = function (type, callback) {
        registerMessageHandler = function () {
            ws.addEventListener(type, callback);
        };
        registerMessageHandler();
    };
}
module.exports = WebSocketWithReconnection;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],50:[function(require,module,exports){
var defineProperty_IE8 = false;
if (Object.defineProperty) {
    try {
        Object.defineProperty({}, "x", {});
    }
    catch (e) {
        defineProperty_IE8 = true;
    }
}
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }
        var aArgs = Array.prototype.slice.call(arguments, 1), fToBind = this, fNOP = function () { }, fBound = function () {
            return fToBind.apply(this instanceof fNOP && oThis
                ? this
                : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();
        return fBound;
    };
}
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var packers = require('./packers');
var Mapper = require('./Mapper');
var BASE_TIMEOUT = 5000;
function unifyResponseMethods(responseMethods) {
    if (!responseMethods)
        return {};
    for (var key in responseMethods) {
        var value = responseMethods[key];
        if (typeof value == 'string')
            responseMethods[key] =
                {
                    response: value
                };
    }
    ;
    return responseMethods;
}
;
function unifyTransport(transport) {
    if (!transport)
        return;
    if (transport instanceof Function)
        return { send: transport };
    if (transport.send instanceof Function)
        return transport;
    if (transport.postMessage instanceof Function) {
        transport.send = transport.postMessage;
        return transport;
    }
    if (transport.write instanceof Function) {
        transport.send = transport.write;
        return transport;
    }
    if (transport.onmessage !== undefined)
        return;
    if (transport.pause instanceof Function)
        return;
    throw new SyntaxError("Transport is not a function nor a valid object");
}
;
function RpcNotification(method, params) {
    if (defineProperty_IE8) {
        this.method = method;
        this.params = params;
    }
    else {
        Object.defineProperty(this, 'method', { value: method, enumerable: true });
        Object.defineProperty(this, 'params', { value: params, enumerable: true });
    }
}
;
function RpcBuilder(packer, options, transport, onRequest) {
    var self = this;
    if (!packer)
        throw new SyntaxError('Packer is not defined');
    if (!packer.pack || !packer.unpack)
        throw new SyntaxError('Packer is invalid');
    var responseMethods = unifyResponseMethods(packer.responseMethods);
    if (options instanceof Function) {
        if (transport != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = options;
        transport = undefined;
        options = undefined;
    }
    ;
    if (options && options.send instanceof Function) {
        if (transport && !(transport instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
        onRequest = transport;
        transport = options;
        options = undefined;
    }
    ;
    if (transport instanceof Function) {
        if (onRequest != undefined)
            throw new SyntaxError("There can't be parameters after onRequest");
        onRequest = transport;
        transport = undefined;
    }
    ;
    if (transport && transport.send instanceof Function)
        if (onRequest && !(onRequest instanceof Function))
            throw new SyntaxError("Only a function can be after transport");
    options = options || {};
    EventEmitter.call(this);
    if (onRequest)
        this.on('request', onRequest);
    if (defineProperty_IE8)
        this.peerID = options.peerID;
    else
        Object.defineProperty(this, 'peerID', { value: options.peerID });
    var max_retries = options.max_retries || 0;
    function transportMessage(event) {
        self.decode(event.data || event);
    }
    ;
    this.getTransport = function () {
        return transport;
    };
    this.setTransport = function (value) {
        if (transport) {
            if (transport.removeEventListener)
                transport.removeEventListener('message', transportMessage);
            else if (transport.removeListener)
                transport.removeListener('data', transportMessage);
        }
        ;
        if (value) {
            if (value.addEventListener)
                value.addEventListener('message', transportMessage);
            else if (value.addListener)
                value.addListener('data', transportMessage);
        }
        ;
        transport = unifyTransport(value);
    };
    if (!defineProperty_IE8)
        Object.defineProperty(this, 'transport', {
            get: this.getTransport.bind(this),
            set: this.setTransport.bind(this)
        });
    this.setTransport(transport);
    var request_timeout = options.request_timeout || BASE_TIMEOUT;
    var ping_request_timeout = options.ping_request_timeout || request_timeout;
    var response_timeout = options.response_timeout || BASE_TIMEOUT;
    var duplicates_timeout = options.duplicates_timeout || BASE_TIMEOUT;
    var requestID = 0;
    var requests = new Mapper();
    var responses = new Mapper();
    var processedResponses = new Mapper();
    var message2Key = {};
    function storeResponse(message, id, dest) {
        var response = {
            message: message,
            timeout: setTimeout(function () {
                responses.remove(id, dest);
            }, response_timeout)
        };
        responses.set(response, id, dest);
    }
    ;
    function storeProcessedResponse(ack, from) {
        var timeout = setTimeout(function () {
            processedResponses.remove(ack, from);
        }, duplicates_timeout);
        processedResponses.set(timeout, ack, from);
    }
    ;
    function RpcRequest(method, params, id, from, transport) {
        RpcNotification.call(this, method, params);
        this.getTransport = function () {
            return transport;
        };
        this.setTransport = function (value) {
            transport = unifyTransport(value);
        };
        if (!defineProperty_IE8)
            Object.defineProperty(this, 'transport', {
                get: this.getTransport.bind(this),
                set: this.setTransport.bind(this)
            });
        var response = responses.get(id, from);
        if (!(transport || self.getTransport())) {
            if (defineProperty_IE8)
                this.duplicated = Boolean(response);
            else
                Object.defineProperty(this, 'duplicated', {
                    value: Boolean(response)
                });
        }
        var responseMethod = responseMethods[method];
        this.pack = packer.pack.bind(packer, this, id);
        this.reply = function (error, result, transport) {
            if (error instanceof Function || error && error.send instanceof Function) {
                if (result != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = error;
                result = null;
                error = undefined;
            }
            else if (result instanceof Function
                || result && result.send instanceof Function) {
                if (transport != undefined)
                    throw new SyntaxError("There can't be parameters after callback");
                transport = result;
                result = null;
            }
            ;
            transport = unifyTransport(transport);
            if (response)
                clearTimeout(response.timeout);
            if (from != undefined) {
                if (error)
                    error.dest = from;
                if (result)
                    result.dest = from;
            }
            ;
            var message;
            if (error || result != undefined) {
                if (self.peerID != undefined) {
                    if (error)
                        error.from = self.peerID;
                    else
                        result.from = self.peerID;
                }
                if (responseMethod) {
                    if (responseMethod.error == undefined && error)
                        message =
                            {
                                error: error
                            };
                    else {
                        var method = error
                            ? responseMethod.error
                            : responseMethod.response;
                        message =
                            {
                                method: method,
                                params: error || result
                            };
                    }
                }
                else
                    message =
                        {
                            error: error,
                            result: result
                        };
                message = packer.pack(message, id);
            }
            else if (response)
                message = response.message;
            else
                message = packer.pack({ result: null }, id);
            storeResponse(message, id, from);
            transport = transport || this.getTransport() || self.getTransport();
            if (transport)
                return transport.send(message);
            return message;
        };
    }
    ;
    inherits(RpcRequest, RpcNotification);
    function cancel(message) {
        var key = message2Key[message];
        if (!key)
            return;
        delete message2Key[message];
        var request = requests.pop(key.id, key.dest);
        if (!request)
            return;
        clearTimeout(request.timeout);
        storeProcessedResponse(key.id, key.dest);
    }
    ;
    this.cancel = function (message) {
        if (message)
            return cancel(message);
        for (var message in message2Key)
            cancel(message);
    };
    this.close = function () {
        var transport = this.getTransport();
        if (transport && transport.close)
            transport.close();
        this.cancel();
        processedResponses.forEach(clearTimeout);
        responses.forEach(function (response) {
            clearTimeout(response.timeout);
        });
    };
    this.encode = function (method, params, dest, transport, callback) {
        if (params instanceof Function) {
            if (dest != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = params;
            transport = undefined;
            dest = undefined;
            params = undefined;
        }
        else if (dest instanceof Function) {
            if (transport != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = dest;
            transport = undefined;
            dest = undefined;
        }
        else if (transport instanceof Function) {
            if (callback != undefined)
                throw new SyntaxError("There can't be parameters after callback");
            callback = transport;
            transport = undefined;
        }
        ;
        if (self.peerID != undefined) {
            params = params || {};
            params.from = self.peerID;
        }
        ;
        if (dest != undefined) {
            params = params || {};
            params.dest = dest;
        }
        ;
        var message = {
            method: method,
            params: params
        };
        if (callback) {
            var id = requestID++;
            var retried = 0;
            message = packer.pack(message, id);
            function dispatchCallback(error, result) {
                self.cancel(message);
                callback(error, result);
            }
            ;
            var request = {
                message: message,
                callback: dispatchCallback,
                responseMethods: responseMethods[method] || {}
            };
            var encode_transport = unifyTransport(transport);
            function sendRequest(transport) {
                var rt = (method === 'ping' ? ping_request_timeout : request_timeout);
                request.timeout = setTimeout(timeout, rt * Math.pow(2, retried++));
                message2Key[message] = { id: id, dest: dest };
                requests.set(request, id, dest);
                transport = transport || encode_transport || self.getTransport();
                if (transport)
                    return transport.send(message);
                return message;
            }
            ;
            function retry(transport) {
                transport = unifyTransport(transport);
                console.warn(retried + ' retry for request message:', message);
                var timeout = processedResponses.pop(id, dest);
                clearTimeout(timeout);
                return sendRequest(transport);
            }
            ;
            function timeout() {
                if (retried < max_retries)
                    return retry(transport);
                var error = new Error('Request has timed out');
                error.request = message;
                error.retry = retry;
                dispatchCallback(error);
            }
            ;
            return sendRequest(transport);
        }
        ;
        message = packer.pack(message);
        transport = transport || this.getTransport();
        if (transport)
            return transport.send(message);
        return message;
    };
    this.decode = function (message, transport) {
        if (!message)
            throw new TypeError("Message is not defined");
        try {
            message = packer.unpack(message);
        }
        catch (e) {
            return console.debug(e, message);
        }
        ;
        var id = message.id;
        var ack = message.ack;
        var method = message.method;
        var params = message.params || {};
        var from = params.from;
        var dest = params.dest;
        if (self.peerID != undefined && from == self.peerID)
            return;
        if (id == undefined && ack == undefined) {
            var notification = new RpcNotification(method, params);
            if (self.emit('request', notification))
                return;
            return notification;
        }
        ;
        function processRequest() {
            transport = unifyTransport(transport) || self.getTransport();
            if (transport) {
                var response = responses.get(id, from);
                if (response)
                    return transport.send(response.message);
            }
            ;
            var idAck = (id != undefined) ? id : ack;
            var request = new RpcRequest(method, params, idAck, from, transport);
            if (self.emit('request', request))
                return;
            return request;
        }
        ;
        function processResponse(request, error, result) {
            request.callback(error, result);
        }
        ;
        function duplicatedResponse(timeout) {
            console.warn("Response already processed", message);
            clearTimeout(timeout);
            storeProcessedResponse(ack, from);
        }
        ;
        if (method) {
            if (dest == undefined || dest == self.peerID) {
                var request = requests.get(ack, from);
                if (request) {
                    var responseMethods = request.responseMethods;
                    if (method == responseMethods.error)
                        return processResponse(request, params);
                    if (method == responseMethods.response)
                        return processResponse(request, null, params);
                    return processRequest();
                }
                var processed = processedResponses.get(ack, from);
                if (processed)
                    return duplicatedResponse(processed);
            }
            return processRequest();
        }
        ;
        var error = message.error;
        var result = message.result;
        if (error && error.dest && error.dest != self.peerID)
            return;
        if (result && result.dest && result.dest != self.peerID)
            return;
        var request = requests.get(ack, from);
        if (!request) {
            var processed = processedResponses.get(ack, from);
            if (processed)
                return duplicatedResponse(processed);
            return console.warn("No callback was defined for this message", message);
        }
        ;
        processResponse(request, error, result);
    };
}
;
inherits(RpcBuilder, EventEmitter);
RpcBuilder.RpcNotification = RpcNotification;
module.exports = RpcBuilder;
var clients = require('./clients');
var transports = require('./clients/transports');
RpcBuilder.clients = clients;
RpcBuilder.clients.transports = transports;
RpcBuilder.packers = packers;

},{"./Mapper":45,"./clients":46,"./clients/transports":48,"./packers":53,"events":1,"inherits":6}],51:[function(require,module,exports){
function pack(message, id) {
    var result = {
        jsonrpc: "2.0"
    };
    if (message.method) {
        result.method = message.method;
        if (message.params)
            result.params = message.params;
        if (id != undefined)
            result.id = id;
    }
    else if (id != undefined) {
        if (message.error) {
            if (message.result !== undefined)
                throw new TypeError("Both result and error are defined");
            result.error = message.error;
        }
        else if (message.result !== undefined)
            result.result = message.result;
        else
            throw new TypeError("No result or error is defined");
        result.id = id;
    }
    ;
    return JSON.stringify(result);
}
;
function unpack(message) {
    var result = message;
    if (typeof message === 'string' || message instanceof String) {
        result = JSON.parse(message);
    }
    var version = result.jsonrpc;
    if (version !== '2.0')
        throw new TypeError("Invalid JsonRPC version '" + version + "': " + message);
    if (result.method == undefined) {
        if (result.id == undefined)
            throw new TypeError("Invalid message: " + message);
        var result_defined = result.result !== undefined;
        var error_defined = result.error !== undefined;
        if (result_defined && error_defined)
            throw new TypeError("Both result and error are defined: " + message);
        if (!result_defined && !error_defined)
            throw new TypeError("No result or error is defined: " + message);
        result.ack = result.id;
        delete result.id;
    }
    return result;
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],52:[function(require,module,exports){
function pack(message) {
    throw new TypeError("Not yet implemented");
}
;
function unpack(message) {
    throw new TypeError("Not yet implemented");
}
;
exports.pack = pack;
exports.unpack = unpack;

},{}],53:[function(require,module,exports){
var JsonRPC = require('./JsonRPC');
var XmlRPC = require('./XmlRPC');
exports.JsonRPC = JsonRPC;
exports.XmlRPC = XmlRPC;

},{"./JsonRPC":51,"./XmlRPC":52}],54:[function(require,module,exports){
var freeice = require('freeice');
var inherits = require('inherits');
var UAParser = require('ua-parser-js');
var uuid = require('uuid');
var hark = require('hark');
var EventEmitter = require('events').EventEmitter;
var recursive = require('merge').recursive.bind(undefined, true);
var sdpTranslator = require('sdp-translator');
var logger = window.Logger || console;
var MEDIA_CONSTRAINTS = {
    audio: true,
    video: {
        width: 640,
        framerate: 15
    }
};
var ua = (window && window.navigator) ? window.navigator.userAgent : '';
var parser = new UAParser(ua);
var browser = parser.getBrowser();
var usePlanB = false;
if (browser.name === 'Chrome' || browser.name === 'Chromium') {
    logger.debug(browser.name + ": using SDP PlanB");
    usePlanB = true;
}
function noop(error) {
    if (error)
        logger.error(error);
}
function trackStop(track) {
    track.stop && track.stop();
}
function streamStop(stream) {
    stream.getTracks().forEach(trackStop);
}
var dumpSDP = function (description) {
    if (typeof description === 'undefined' || description === null) {
        return '';
    }
    return 'type: ' + description.type + '\r\n' + description.sdp;
};
function bufferizeCandidates(pc, onerror) {
    var candidatesQueue = [];
    pc.addEventListener('signalingstatechange', function () {
        if (this.signalingState === 'stable') {
            while (candidatesQueue.length) {
                var entry = candidatesQueue.shift();
                pc.addIceCandidate(entry.candidate, entry.callback, entry.callback);
            }
        }
    });
    return function (candidate, callback) {
        callback = callback || onerror;
        switch (pc.signalingState) {
            case 'closed':
                callback(new Error('PeerConnection object is closed'));
                break;
            case 'stable':
                if (pc.remoteDescription) {
                    pc.addIceCandidate(candidate, callback, callback);
                }
                break;
            default:
                candidatesQueue.push({
                    candidate: candidate,
                    callback: callback
                });
        }
    };
}
function removeFIDFromOffer(sdp) {
    var n = sdp.indexOf("a=ssrc-group:FID");
    if (n > 0) {
        return sdp.slice(0, n);
    }
    else {
        return sdp;
    }
}
function getSimulcastInfo(videoStream) {
    var videoTracks = videoStream.getVideoTracks();
    if (!videoTracks.length) {
        logger.warn('No video tracks available in the video stream');
        return '';
    }
    var lines = [
        'a=x-google-flag:conference',
        'a=ssrc-group:SIM 1 2 3',
        'a=ssrc:1 cname:localVideo',
        'a=ssrc:1 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:1 mslabel:' + videoStream.id,
        'a=ssrc:1 label:' + videoTracks[0].id,
        'a=ssrc:2 cname:localVideo',
        'a=ssrc:2 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:2 mslabel:' + videoStream.id,
        'a=ssrc:2 label:' + videoTracks[0].id,
        'a=ssrc:3 cname:localVideo',
        'a=ssrc:3 msid:' + videoStream.id + ' ' + videoTracks[0].id,
        'a=ssrc:3 mslabel:' + videoStream.id,
        'a=ssrc:3 label:' + videoTracks[0].id
    ];
    lines.push('');
    return lines.join('\n');
}
function WebRtcPeer(mode, options, callback) {
    if (!(this instanceof WebRtcPeer)) {
        return new WebRtcPeer(mode, options, callback);
    }
    WebRtcPeer.super_.call(this);
    if (options instanceof Function) {
        callback = options;
        options = undefined;
    }
    options = options || {};
    callback = (callback || noop).bind(this);
    var self = this;
    var localVideo = options.localVideo;
    var remoteVideo = options.remoteVideo;
    var videoStream = options.videoStream;
    var audioStream = options.audioStream;
    var mediaConstraints = options.mediaConstraints;
    var connectionConstraints = options.connectionConstraints;
    var pc = options.peerConnection;
    var sendSource = options.sendSource || 'webcam';
    var guid = uuid.v4();
    var configuration = recursive({
        iceServers: (!!options.iceServers && options.iceServers.length > 0) ? options.iceServers : freeice()
    }, options.configuration);
    var onicecandidate = options.onicecandidate;
    if (onicecandidate)
        this.on('icecandidate', onicecandidate);
    var oncandidategatheringdone = options.oncandidategatheringdone;
    if (oncandidategatheringdone) {
        this.on('candidategatheringdone', oncandidategatheringdone);
    }
    var simulcast = options.simulcast;
    var multistream = options.multistream;
    var interop = new sdpTranslator.Interop();
    var candidatesQueueOut = [];
    var candidategatheringdone = false;
    Object.defineProperties(this, {
        'peerConnection': {
            get: function () {
                return pc;
            }
        },
        'id': {
            value: options.id || guid,
            writable: false
        },
        'remoteVideo': {
            get: function () {
                return remoteVideo;
            }
        },
        'localVideo': {
            get: function () {
                return localVideo;
            }
        },
        'currentFrame': {
            get: function () {
                if (!remoteVideo)
                    return;
                if (remoteVideo.readyState < remoteVideo.HAVE_CURRENT_DATA)
                    throw new Error('No video stream data available');
                var canvas = document.createElement('canvas');
                canvas.width = remoteVideo.videoWidth;
                canvas.height = remoteVideo.videoHeight;
                canvas.getContext('2d').drawImage(remoteVideo, 0, 0);
                return canvas;
            }
        }
    });
    if (!pc) {
        pc = new RTCPeerConnection(configuration);
    }
    pc.addEventListener('icecandidate', function (event) {
        var candidate = event.candidate;
        if (EventEmitter.listenerCount(self, 'icecandidate') ||
            EventEmitter.listenerCount(self, 'candidategatheringdone')) {
            if (candidate) {
                var cand;
                if (multistream && usePlanB) {
                    cand = interop.candidateToUnifiedPlan(candidate);
                }
                else {
                    cand = candidate;
                }
                self.emit('icecandidate', cand);
                candidategatheringdone = false;
            }
            else if (!candidategatheringdone) {
                self.emit('candidategatheringdone');
                candidategatheringdone = true;
            }
        }
        else if (!candidategatheringdone) {
            candidatesQueueOut.push(candidate);
            if (!candidate)
                candidategatheringdone = true;
        }
    });
    pc.onaddstream = options.onaddstream;
    pc.onnegotiationneeded = options.onnegotiationneeded;
    this.on('newListener', function (event, listener) {
        if (event === 'icecandidate' || event === 'candidategatheringdone') {
            while (candidatesQueueOut.length) {
                var candidate = candidatesQueueOut.shift();
                if (!candidate === (event === 'candidategatheringdone')) {
                    listener(candidate);
                }
            }
        }
    });
    var addIceCandidate = bufferizeCandidates(pc);
    this.addIceCandidate = function (iceCandidate, callback) {
        var candidate;
        if (multistream && usePlanB) {
            candidate = interop.candidateToPlanB(iceCandidate);
        }
        else {
            candidate = new RTCIceCandidate(iceCandidate);
        }
        logger.debug('Remote ICE candidate received', iceCandidate);
        callback = (callback || noop).bind(this);
        addIceCandidate(candidate, callback);
    };
    this.generateOffer = function (callback) {
        callback = callback.bind(this);
        var offerAudio = true;
        var offerVideo = true;
        if (mediaConstraints) {
            offerAudio = (typeof mediaConstraints.audio === 'boolean') ?
                mediaConstraints.audio : true;
            offerVideo = (typeof mediaConstraints.video === 'boolean') ?
                mediaConstraints.video : true;
        }
        var browserDependantConstraints = {
            offerToReceiveAudio: (mode !== 'sendonly' && offerAudio),
            offerToReceiveVideo: (mode !== 'sendonly' && offerVideo)
        };
        var constraints = browserDependantConstraints;
        logger.debug('constraints: ' + JSON.stringify(constraints));
        pc.createOffer(constraints).then(function (offer) {
            logger.debug('Created SDP offer');
            offer = mangleSdpToAddSimulcast(offer);
            return pc.setLocalDescription(offer);
        }).then(function () {
            var localDescription = pc.localDescription;
            logger.debug('Local description set', localDescription.sdp);
            if (multistream && usePlanB) {
                localDescription = interop.toUnifiedPlan(localDescription);
                logger.debug('offer::origPlanB->UnifiedPlan', dumpSDP(localDescription));
            }
            callback(null, localDescription.sdp, self.processAnswer.bind(self));
        }).catch(callback);
    };
    this.getLocalSessionDescriptor = function () {
        return pc.localDescription;
    };
    this.getRemoteSessionDescriptor = function () {
        return pc.remoteDescription;
    };
    function setRemoteVideo() {
        if (remoteVideo) {
            remoteVideo.pause();
            var stream = pc.getRemoteStreams()[0];
            remoteVideo.srcObject = stream;
            logger.debug('Remote stream:', stream);
            remoteVideo.load();
        }
    }
    this.showLocalVideo = function () {
        localVideo.srcObject = videoStream;
        localVideo.muted = true;
    };
    this.processAnswer = function (sdpAnswer, callback) {
        callback = (callback || noop).bind(this);
        var answer = new RTCSessionDescription({
            type: 'answer',
            sdp: sdpAnswer
        });
        if (multistream && usePlanB) {
            var planBAnswer = interop.toPlanB(answer);
            logger.debug('asnwer::planB', dumpSDP(planBAnswer));
            answer = planBAnswer;
        }
        logger.debug('SDP answer received, setting remote description');
        if (pc.signalingState === 'closed') {
            return callback('PeerConnection is closed');
        }
        pc.setRemoteDescription(answer, function () {
            setRemoteVideo();
            callback();
        }, callback);
    };
    this.processOffer = function (sdpOffer, callback) {
        callback = callback.bind(this);
        var offer = new RTCSessionDescription({
            type: 'offer',
            sdp: sdpOffer
        });
        if (multistream && usePlanB) {
            var planBOffer = interop.toPlanB(offer);
            logger.debug('offer::planB', dumpSDP(planBOffer));
            offer = planBOffer;
        }
        logger.debug('SDP offer received, setting remote description');
        if (pc.signalingState === 'closed') {
            return callback('PeerConnection is closed');
        }
        pc.setRemoteDescription(offer).then(function () {
            return setRemoteVideo();
        }).then(function () {
            return pc.createAnswer();
        }).then(function (answer) {
            answer = mangleSdpToAddSimulcast(answer);
            logger.debug('Created SDP answer');
            return pc.setLocalDescription(answer);
        }).then(function () {
            var localDescription = pc.localDescription;
            if (multistream && usePlanB) {
                localDescription = interop.toUnifiedPlan(localDescription);
                logger.debug('answer::origPlanB->UnifiedPlan', dumpSDP(localDescription));
            }
            logger.debug('Local description set', localDescription.sdp);
            callback(null, localDescription.sdp);
        }).catch(callback);
    };
    function mangleSdpToAddSimulcast(answer) {
        if (simulcast) {
            if (browser.name === 'Chrome' || browser.name === 'Chromium') {
                logger.debug('Adding multicast info');
                answer = new RTCSessionDescription({
                    'type': answer.type,
                    'sdp': removeFIDFromOffer(answer.sdp) + getSimulcastInfo(videoStream)
                });
            }
            else {
                logger.warn('Simulcast is only available in Chrome browser.');
            }
        }
        return answer;
    }
    function start() {
        if (pc.signalingState === 'closed') {
            callback('The peer connection object is in "closed" state. This is most likely due to an invocation of the dispose method before accepting in the dialogue');
        }
        if (videoStream && localVideo) {
            self.showLocalVideo();
        }
        if (videoStream) {
            pc.addStream(videoStream);
        }
        if (audioStream) {
            pc.addStream(audioStream);
        }
        var browser = parser.getBrowser();
        if (mode === 'sendonly' &&
            (browser.name === 'Chrome' || browser.name === 'Chromium') &&
            browser.major === 39) {
            mode = 'sendrecv';
        }
        callback();
    }
    if (mode !== 'recvonly' && !videoStream && !audioStream) {
        function getMedia(constraints) {
            if (constraints === undefined) {
                constraints = MEDIA_CONSTRAINTS;
            }
            navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
                videoStream = stream;
                start();
            }).catch(callback);
        }
        if (sendSource === 'webcam') {
            getMedia(mediaConstraints);
        }
        else {
            getScreenConstraints(sendSource, function (error, constraints_) {
                if (error)
                    return callback(error);
                constraints = [mediaConstraints];
                constraints.unshift(constraints_);
                getMedia(recursive.apply(undefined, constraints));
            }, guid);
        }
    }
    else {
        setTimeout(start, 0);
    }
    this.on('_dispose', function () {
        if (localVideo) {
            localVideo.pause();
            localVideo.srcObject = null;
            localVideo.load();
            localVideo.muted = false;
        }
        if (remoteVideo) {
            remoteVideo.pause();
            remoteVideo.srcObject = null;
            remoteVideo.load();
        }
        self.removeAllListeners();
        if (window.cancelChooseDesktopMedia !== undefined) {
            window.cancelChooseDesktopMedia(guid);
        }
    });
}
inherits(WebRtcPeer, EventEmitter);
function createEnableDescriptor(type) {
    var method = 'get' + type + 'Tracks';
    return {
        enumerable: true,
        get: function () {
            if (!this.peerConnection)
                return;
            var streams = this.peerConnection.getLocalStreams();
            if (!streams.length)
                return;
            for (var i = 0, stream; stream = streams[i]; i++) {
                var tracks = stream[method]();
                for (var j = 0, track; track = tracks[j]; j++)
                    if (!track.enabled)
                        return false;
            }
            return true;
        },
        set: function (value) {
            function trackSetEnable(track) {
                track.enabled = value;
            }
            this.peerConnection.getLocalStreams().forEach(function (stream) {
                stream[method]().forEach(trackSetEnable);
            });
        }
    };
}
Object.defineProperties(WebRtcPeer.prototype, {
    'enabled': {
        enumerable: true,
        get: function () {
            return this.audioEnabled && this.videoEnabled;
        },
        set: function (value) {
            this.audioEnabled = this.videoEnabled = value;
        }
    },
    'audioEnabled': createEnableDescriptor('Audio'),
    'videoEnabled': createEnableDescriptor('Video')
});
WebRtcPeer.prototype.getLocalStream = function (index) {
    if (this.peerConnection) {
        return this.peerConnection.getLocalStreams()[index || 0];
    }
};
WebRtcPeer.prototype.getRemoteStream = function (index) {
    if (this.peerConnection) {
        return this.peerConnection.getRemoteStreams()[index || 0];
    }
};
WebRtcPeer.prototype.dispose = function () {
    logger.debug('Disposing WebRtcPeer');
    var pc = this.peerConnection;
    try {
        if (pc) {
            if (pc.signalingState === 'closed')
                return;
            pc.getLocalStreams().forEach(streamStop);
            pc.close();
        }
    }
    catch (err) {
        logger.warn('Exception disposing webrtc peer ' + err);
    }
    this.emit('_dispose');
};
function WebRtcPeerRecvonly(options, callback) {
    if (!(this instanceof WebRtcPeerRecvonly)) {
        return new WebRtcPeerRecvonly(options, callback);
    }
    WebRtcPeerRecvonly.super_.call(this, 'recvonly', options, callback);
}
inherits(WebRtcPeerRecvonly, WebRtcPeer);
function WebRtcPeerSendonly(options, callback) {
    if (!(this instanceof WebRtcPeerSendonly)) {
        return new WebRtcPeerSendonly(options, callback);
    }
    WebRtcPeerSendonly.super_.call(this, 'sendonly', options, callback);
}
inherits(WebRtcPeerSendonly, WebRtcPeer);
function WebRtcPeerSendrecv(options, callback) {
    if (!(this instanceof WebRtcPeerSendrecv)) {
        return new WebRtcPeerSendrecv(options, callback);
    }
    WebRtcPeerSendrecv.super_.call(this, 'sendrecv', options, callback);
}
inherits(WebRtcPeerSendrecv, WebRtcPeer);
function harkUtils(stream, options) {
    return hark(stream, options);
}
exports.bufferizeCandidates = bufferizeCandidates;
exports.WebRtcPeerRecvonly = WebRtcPeerRecvonly;
exports.WebRtcPeerSendonly = WebRtcPeerSendonly;
exports.WebRtcPeerSendrecv = WebRtcPeerSendrecv;
exports.hark = harkUtils;

},{"events":1,"freeice":2,"hark":5,"inherits":6,"merge":7,"sdp-translator":15,"ua-parser-js":18,"uuid":19}],55:[function(require,module,exports){
var WebRtcPeer = require('./WebRtcPeer');
exports.WebRtcPeer = WebRtcPeer;

},{"./WebRtcPeer":54}],56:[function(require,module,exports){
window.getScreenId = function (callback) {
    if (!!navigator.mozGetUserMedia) {
        callback(null, 'firefox', {
            video: {
                mozMediaSource: 'window',
                mediaSource: 'window'
            }
        });
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeMediaSourceId) {
            if (event.data.chromeMediaSourceId === 'PermissionDeniedError') {
                callback('permission-denied');
            }
            else {
                callback(null, event.data.chromeMediaSourceId, getScreenConstraints(null, event.data.chromeMediaSourceId));
            }
            window.removeEventListener('message', onIFrameCallback);
        }
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus, null, getScreenConstraints(event.data.chromeExtensionStatus));
            window.removeEventListener('message', onIFrameCallback);
        }
    }
    setTimeout(postGetSourceIdMessage, 100);
};
function getScreenConstraints(error, sourceId) {
    var screen_constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: error ? 'screen' : 'desktop',
                maxWidth: window.screen.width > 1920 ? window.screen.width : 1920,
                maxHeight: window.screen.height > 1080 ? window.screen.height : 1080
            },
            optional: []
        }
    };
    if (sourceId) {
        screen_constraints.video.mandatory.chromeMediaSourceId = sourceId;
    }
    return screen_constraints;
}
var iframe;
function postGetSourceIdMessage() {
    if (!iframe) {
        loadIFrame(postGetSourceIdMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetSourceIdMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        captureSourceId: true
    }, '*');
}
function loadIFrame(loadCallback) {
    if (iframe) {
        loadCallback();
        return;
    }
    iframe = document.createElement('iframe');
    iframe.onload = function () {
        iframe.isLoaded = true;
        loadCallback();
    };
    iframe.src = 'https://www.webrtc-experiment.com/getSourceId/';
    iframe.style.display = 'none';
    (document.body || document.documentElement).appendChild(iframe);
}
window.getChromeExtensionStatus = function (callback) {
    if (!!navigator.mozGetUserMedia) {
        callback('installed-enabled');
        return;
    }
    window.addEventListener('message', onIFrameCallback);
    function onIFrameCallback(event) {
        if (!event.data)
            return;
        if (event.data.chromeExtensionStatus) {
            callback(event.data.chromeExtensionStatus);
        }
        window.removeEventListener('message', onIFrameCallback);
    }
    setTimeout(postGetChromeExtensionStatusMessage, 100);
};
function postGetChromeExtensionStatusMessage() {
    if (!iframe) {
        loadIFrame(postGetChromeExtensionStatusMessage);
        return;
    }
    if (!iframe.isLoaded) {
        setTimeout(postGetChromeExtensionStatusMessage, 100);
        return;
    }
    iframe.contentWindow.postMessage({
        getChromeExtensionStatus: true
    }, '*');
}
exports.getScreenId = getScreenId;

},{}],57:[function(require,module,exports){
var chromeMediaSource = 'screen';
var screenCallback;
var isFirefox = typeof window.InstallTrigger !== 'undefined';
var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
var isChrome = !!window.chrome && !isOpera;
window.addEventListener('message', function (event) {
    if (event.origin != window.location.origin) {
        return;
    }
    onMessageCallback(event.data);
});
function onMessageCallback(data) {
    if (data == 'PermissionDeniedError') {
        chromeMediaSource = 'PermissionDeniedError';
        if (screenCallback)
            return screenCallback('PermissionDeniedError');
        else
            throw new Error('PermissionDeniedError');
    }
    if (data == 'rtcmulticonnection-extension-loaded') {
        chromeMediaSource = 'desktop';
    }
    if (data.sourceId && screenCallback) {
        screenCallback(sourceId = data.sourceId);
    }
}
function isChromeExtensionAvailable(callback) {
    if (isFirefox)
        return callback(false);
    if (chromeMediaSource == 'desktop')
        return callback('isFirefox');
    window.postMessage('are-you-there', '*');
    setTimeout(function () {
        if (chromeMediaSource == 'screen') {
            callback('unavailable');
        }
        else
            callback('available');
    }, 2000);
}
function getSourceId(callback) {
    if (!callback)
        throw '"callback" parameter is mandatory.';
    if (sourceId)
        return callback(sourceId);
    screenCallback = callback;
    window.postMessage('get-sourceId', '*');
}
function getChromeExtensionStatus(extensionid, callback) {
    if (isFirefox)
        return callback('not-chrome');
    if (arguments.length != 2) {
        callback = extensionid;
        extensionid = 'ajhifddimkapgcifgcodmmfdlknahffk';
    }
    var image = document.createElement('img');
    image.src = 'chrome-extension://' + extensionid + '/icon.png';
    image.onload = function () {
        chromeMediaSource = 'screen';
        window.postMessage('are-you-there', '*');
        setTimeout(function () {
            if (chromeMediaSource == 'screen') {
                callback(extensionid == extensionid ? 'installed-enabled' : 'installed-disabled');
            }
            else
                callback('installed-enabled');
        }, 2000);
    };
    image.onerror = function () {
        callback('not-installed');
    };
}
function getScreenConstraints(callback) {
    sourceId = '';
    var firefoxScreenConstraints = {
        mozMediaSource: 'window',
        mediaSource: 'window'
    };
    if (isFirefox)
        return callback(null, firefoxScreenConstraints);
    var screen_constraints = {
        mandatory: {
            chromeMediaSource: chromeMediaSource,
            maxWidth: screen.width > 1920 ? screen.width : 1920,
            maxHeight: screen.height > 1080 ? screen.height : 1080
        },
        optional: []
    };
    if (chromeMediaSource == 'desktop' && !sourceId) {
        getSourceId(function () {
            screen_constraints.mandatory.chromeMediaSourceId = sourceId;
            callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
        });
        return;
    }
    if (chromeMediaSource == 'desktop') {
        screen_constraints.mandatory.chromeMediaSourceId = sourceId;
    }
    callback(null, screen_constraints);
}
exports.getScreenConstraints = getScreenConstraints;
exports.isChromeExtensionAvailable = isChromeExtensionAvailable;
exports.getChromeExtensionStatus = getChromeExtensionStatus;
exports.getSourceId = getSourceId;

},{}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var platform = require("platform");
var WebRtcStats = (function () {
    function WebRtcStats(stream) {
        this.stream = stream;
        this.webRtcStatsEnabled = false;
        this.statsInterval = 1;
        this.stats = {
            inbound: {
                audio: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0
                },
                video: {
                    bytesReceived: 0,
                    packetsReceived: 0,
                    packetsLost: 0,
                    framesDecoded: 0,
                    nackCount: 0
                }
            },
            outbound: {
                audio: {
                    bytesSent: 0,
                    packetsSent: 0,
                },
                video: {
                    bytesSent: 0,
                    packetsSent: 0,
                    framesEncoded: 0,
                    nackCount: 0
                }
            }
        };
    }
    WebRtcStats.prototype.isEnabled = function () {
        return this.webRtcStatsEnabled;
    };
    WebRtcStats.prototype.initWebRtcStats = function () {
        var _this = this;
        var elastestInstrumentation = localStorage.getItem('elastest-instrumentation');
        if (elastestInstrumentation) {
            console.warn('WebRtc stats enabled for stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
            this.webRtcStatsEnabled = true;
            var instrumentation_1 = JSON.parse(elastestInstrumentation);
            this.statsInterval = instrumentation_1.webrtc.interval;
            console.warn('localStorage item: ' + JSON.stringify(instrumentation_1));
            this.webRtcStatsIntervalId = setInterval(function () {
                _this.sendStatsToHttpEndpoint(instrumentation_1);
            }, this.statsInterval * 1000);
            return;
        }
        console.debug('WebRtc stats not enabled');
    };
    WebRtcStats.prototype.stopWebRtcStats = function () {
        if (this.webRtcStatsEnabled) {
            clearInterval(this.webRtcStatsIntervalId);
            console.warn('WebRtc stats stopped for disposed stream ' + this.stream.streamId + ' of connection ' + this.stream.connection.connectionId);
        }
    };
    WebRtcStats.prototype.sendStatsToHttpEndpoint = function (instrumentation) {
        var _this = this;
        var sendPost = function (json) {
            var http = new XMLHttpRequest();
            var url = instrumentation.webrtc.httpEndpoint;
            http.open('POST', url, true);
            http.setRequestHeader('Content-type', 'application/json');
            http.onreadystatechange = function () {
                if (http.readyState === 4 && http.status === 200) {
                    console.log('WebRtc stats successfully sent to ' + url + ' for stream ' + _this.stream.streamId + ' of connection ' + _this.stream.connection.connectionId);
                }
            };
            http.send(json);
        };
        var f = function (stats) {
            if (platform.name.indexOf('Firefox') !== -1) {
                stats.forEach(function (stat) {
                    var json = {};
                    if ((stat.type === 'inbound-rtp') &&
                        (stat.nackCount !== null &&
                            stat.isRemote === false &&
                            stat.id.startsWith('inbound') &&
                            stat.remoteId.startsWith('inbound'))) {
                        var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                        var jit = stat.jitter * 1000;
                        var metrics = {
                            bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                            jitter: jit,
                            packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                            packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                        };
                        var units = {
                            bytesReceived: 'bytes',
                            jitter: 'ms',
                            packetsReceived: 'packets',
                            packetsLost: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                            metrics['nackCount'] = (stat.nackCount - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                            units['framesDecoded'] = 'frames';
                            units['nackCount'] = 'packets';
                            _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                            _this.stats.inbound.video.nackCount = stat.nackCount;
                        }
                        _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                        _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                        _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                    else if ((stat.type === 'outbound-rtp') &&
                        (stat.isRemote === false &&
                            stat.id.toLowerCase().includes('outbound'))) {
                        var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                        var metrics = {
                            bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                            packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                        };
                        var units = {
                            bytesSent: 'bytes',
                            packetsSent: 'packets'
                        };
                        if (stat.mediaType === 'video') {
                            metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                            units['framesEncoded'] = 'frames';
                            _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                        }
                        _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                        _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                        json = {
                            '@timestamp': new Date(stat.timestamp).toISOString(),
                            'exec': instrumentation.exec,
                            'component': instrumentation.component,
                            'stream': 'webRtc',
                            'type': metricId,
                            'stream_type': 'composed_metrics',
                            'units': units
                        };
                        json[metricId] = metrics;
                        sendPost(JSON.stringify(json));
                    }
                });
            }
            else if (platform.name.indexOf('Chrome') !== -1) {
                for (var _i = 0, _a = Object.keys(stats); _i < _a.length; _i++) {
                    var key = _a[_i];
                    var stat = stats[key];
                    if (stat.type === 'ssrc') {
                        var json = {};
                        if ('bytesReceived' in stat && ((stat.mediaType === 'audio' && 'audioOutputLevel' in stat) ||
                            (stat.mediaType === 'video' && 'qpSum' in stat))) {
                            var metricId = 'webrtc_inbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesReceived: (stat.bytesReceived - _this.stats.inbound[stat.mediaType].bytesReceived) / _this.statsInterval,
                                jitter: stat.googJitterBufferMs,
                                packetsReceived: (stat.packetsReceived - _this.stats.inbound[stat.mediaType].packetsReceived) / _this.statsInterval,
                                packetsLost: (stat.packetsLost - _this.stats.inbound[stat.mediaType].packetsLost) / _this.statsInterval
                            };
                            var units = {
                                bytesReceived: 'bytes',
                                jitter: 'ms',
                                packetsReceived: 'packets',
                                packetsLost: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesDecoded'] = (stat.framesDecoded - _this.stats.inbound.video.framesDecoded) / _this.statsInterval;
                                metrics['nackCount'] = (stat.googNacksSent - _this.stats.inbound.video.nackCount) / _this.statsInterval;
                                units['framesDecoded'] = 'frames';
                                units['nackCount'] = 'packets';
                                _this.stats.inbound.video.framesDecoded = stat.framesDecoded;
                                _this.stats.inbound.video.nackCount = stat.googNacksSent;
                            }
                            _this.stats.inbound[stat.mediaType].bytesReceived = stat.bytesReceived;
                            _this.stats.inbound[stat.mediaType].packetsReceived = stat.packetsReceived;
                            _this.stats.inbound[stat.mediaType].packetsLost = stat.packetsLost;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                        else if ('bytesSent' in stat) {
                            var metricId = 'webrtc_outbound_' + stat.mediaType + '_' + stat.ssrc;
                            var metrics = {
                                bytesSent: (stat.bytesSent - _this.stats.outbound[stat.mediaType].bytesSent) / _this.statsInterval,
                                packetsSent: (stat.packetsSent - _this.stats.outbound[stat.mediaType].packetsSent) / _this.statsInterval
                            };
                            var units = {
                                bytesSent: 'bytes',
                                packetsSent: 'packets'
                            };
                            if (stat.mediaType === 'video') {
                                metrics['framesEncoded'] = (stat.framesEncoded - _this.stats.outbound.video.framesEncoded) / _this.statsInterval;
                                units['framesEncoded'] = 'frames';
                                _this.stats.outbound.video.framesEncoded = stat.framesEncoded;
                            }
                            _this.stats.outbound[stat.mediaType].bytesSent = stat.bytesSent;
                            _this.stats.outbound[stat.mediaType].packetsSent = stat.packetsSent;
                            json = {
                                '@timestamp': new Date(stat.timestamp).toISOString(),
                                'exec': instrumentation.exec,
                                'component': instrumentation.component,
                                'stream': 'webRtc',
                                'type': metricId,
                                'stream_type': 'composed_metrics',
                                'units': units
                            };
                            json[metricId] = metrics;
                            sendPost(JSON.stringify(json));
                        }
                    }
                }
            }
        };
        this.getStatsAgnostic(this.stream.getRTCPeerConnection(), f, function (error) { console.log(error); });
    };
    WebRtcStats.prototype.standardizeReport = function (response) {
        if (platform.name.indexOf('Firefox') !== -1) {
            return response;
        }
        var standardReport = {};
        response.result().forEach(function (report) {
            var standardStats = {
                id: report.id,
                timestamp: report.timestamp,
                type: report.type
            };
            report.names().forEach(function (name) {
                standardStats[name] = report.stat(name);
            });
            standardReport[standardStats.id] = standardStats;
        });
        return standardReport;
    };
    WebRtcStats.prototype.getStatsAgnostic = function (pc, successCb, failureCb) {
        var _this = this;
        if (platform.name.indexOf('Firefox') !== -1) {
            return pc.getStats(null, function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, failureCb);
        }
        else if (platform.name.indexOf('Chrome') !== -1) {
            return pc.getStats(function (response) {
                var report = _this.standardizeReport(response);
                successCb(report);
            }, null, failureCb);
        }
    };
    return WebRtcStats;
}());
exports.WebRtcStats = WebRtcStats;

},{"platform":9}]},{},[26])