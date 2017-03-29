/**
 * invoke the function with the list of arguments
 * Like func.apply() but much faster
 *
 * Copyright (C) 2015-2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

module.exports = {
    invoke: invoke,
    invoke2: invoke2,
    invoke2f: invoke2f,
    interceptCall: interceptCall,
    thunkify: thunkify,
    once: callOnce,
    errorToObject: errorToObject,
    objectToError: objectToError,

    //invokeAny: invokeAny,
    //invoke2Any: invoke2Any,
};


// apply the function to the argument list
// 100m/s, 13m/s apply
// Skylake node-v0.10.42: 122m/s, 34m/s apply
// Skylake node-v7.5.0: 133m/s, 65m/s apply (210m/s, 116m/s meas 2 sec)
function invoke( fn, av ) {
    switch (av.length) {
    case 0: return fn()
    case 1: return fn(av[0])
    case 2: return fn(av[0], av[1])
    case 3: return fn(av[0], av[1], av[2])
    default: return fn.apply(null, av)
    }
}

// apply the named method to the argument list
// 60m/s, 16m/s apply
// Skylake node-v0.10.42: 122m/s, 34m/s apply
// Skylake node-v7.5.0: 80m/s, 52m/s apply
function invoke2( obj, name, av ) {
    switch (av.length) {
    case 0: return obj[name]()
    case 1: return obj[name](av[0])
    case 2: return obj[name](av[0], av[1])
    case 3: return obj[name](av[0], av[1], av[2])
    default: return obj[name].apply(obj, av)
    }
}

// apply the method function to the argument list
// 40m/s call, 16m/s apply
// Skylake node-v0.10.42: 96m/s, 34m/s apply
// Skylake node-v7.5.0: 120m/s, 64m/s apply
function invoke2f( obj, fn, av ) {
    switch (av.length) {
    case 0: return fn.call(obj)
    case 1: return fn.call(obj, av[0])
    case 2: return fn.call(obj, av[0], av[1])
    case 3: return fn.call(obj, av[0], av[1], av[2])
    default: return fn.apply(obj, av)
    }
}

/**
 * wrapper fn and ensure it will be called only once
 * Can wrapper method calls, just attach the wrapper to the object.
 */
/**
function callOnce1( fn ) {
    if (typeof fn !== 'function') throw new Error("not a function");
    var called = false;
    return interceptCall(fn, function(method, self, args) {
        if (!called) {
            called = true;
            invoke2f(self, method, args);
        }
    })
}
**/

function callOnce( fn ) {
    var called = false;
    return function() {
        if (called) return;
        called = true;
        switch (arguments.length) {
        case 0:  return fn();
        case 1:  return fn(arguments[0]);
        case 2:  return fn(arguments[0], arguments[1]);
        case 3:  return fn(arguments[0], arguments[1], arguments[2]);
        default:
            var args = new Array();
            for (var i=0; i<arguments.length; i++) args[i] = arguments[i];
            return fn.apply(null, args);
        }
    }
}


/*
 * convert the error with its non-enumerable fields into a serializable object
 */
function errorToObject( err, strict ) {
    // non-objects are already serializable
    if (!err || typeof err !== 'object') return err;
    if (strict && !(err instanceof Error)) return err;

    var obj = {};
    obj._isError__ = true;
    obj._eConstructor__ = err.constructor && err.constructor.name;

    var fields = Object.getOwnPropertyNames(err);
    for (var i=0; i<fields.length; i++) {
        obj[fields[i]] = err[fields[i]];
    }

    return obj;
}

/*
 * convert a plain object back into an Error,
 * with the instanceof and properties of the original.
 */
function objectToError( obj, strict ) {
    if (!obj || strict && !obj._isError__) return obj;

    var constructorName = obj._eConstructor__;
    if (!constructorName || !global[constructorName]) constructorName = 'Error';

    var err = new global[constructorName]();
    var fields = Object.getOwnPropertyNames(err);
    for (var i=0; i<fields.length; i++) delete err[fields[i]];

    var hiddenFields = ['message', 'code', 'errno', 'syscall', 'path', 'address', 'port', 'stack'];

    for (var k in obj) err[k] = obj[k];
    if ('_isError__' in err) delete err._isError__;
    if ('_eConstructor__' in err) delete err._eConstructor__;
    // ensure that .message and .stack are always set
    if (obj.message === undefined) err.message = "";
    if (obj.stack === undefined) err.stack = err.toString() + '\n';

    for (var k in err) if (hiddenFields.indexOf(k) >= 0) Object.defineProperty(err, k, { enumerable: false });
    return err;
}

/**
// XXX direct call is 60% faster than indirecting through here
// XXX 123ms vs 92ms 33% faster if correct number of arguments passed to function (123 when expects 3, got 2)
// XXX 343ms vs 130ms *much* slower to invoke if testing !arguments[2] and is not provided
function invokeAny( fn, obj, av ) {
    if (av) return (typeof fn === 'function') ? invoke2f(obj, fn, av) : invoke2(obj, fn, av);
    else return invoke(fn, obj);
    //if (arguments[2]) return (typeof arguments[0] === 'function') ? invoke2f(arguments[1], arguments[0], arguments[2]) : invoke2(arguments[1], arguments[0], arguments[2]);
    //else return invoke(arguments[0], arguments[1]);
}

function invoke2Any( fn, obj, av ) {
    return typeof fn === 'function' ? invoke2f(obj, fn, av) : invoke2(obj, fn, av);
}
**/

/*
 * Intercept calls to the function or method and redirect them to the handler.
 * To just return the arguments, use interceptCall(null, null, function(fn, obj, av){ return av })
 * If the self object is not specified, use the `this` the intercept is attached to.
 * The intercept returns the handler result so it can be used synchronously too.
 */
function interceptCall( method, self, handler ) {
    if (!handler && typeof self === 'function' ) { handler = self ; self = null }
    if (typeof handler !== 'function') throw new Error("handler function required");

    return function callIntercepter( ) {
        switch (arguments.length) {
        case 0: args = []; break;
        case 1: args = [arguments[0]]; break;
        case 2: args = [arguments[0], arguments[1]]; break;
        case 3: args = [arguments[0], arguments[1], arguments[2]]; break;
        default:
            var args = new Array();
            for (var i=0; i<arguments.length; i++) args[i] = arguments[i];
            break;
        }

        if (!self) self = this;
        return handler(method, self, args);
    }
}


/*
 * thunkify the function or method or named method
 *
 * Thunkify splits a function into two:  one to just save the arguments (no callback),
 * and one to run apply the function to the pre-saved arguments and newly provided callback.
 * E.g., stream.write(string, encoding, callback) becomes
 *     var streamWrite = thunkify('write', stream);
 *     var thunk = streamWrite("test message", 'utf8');
 *     // ...
 *     thunk(function(err, ret) {
 *         // wrote "test message"
 *     });
 */
function thunkify( method, object ) {
    var _invoke1, _invoke2;
    if (object) {
        _invoke2 = typeof method === 'function' ? invoke2f : invoke2;
    }
    else {
        _invoke1 = invoke;
        if (typeof method !== 'function') throw new Error("function or method required");
    }

    // return a function that saves its arguments and will return a function that
    // takes a callback that will invoke the saved arguments plus callback
    return interceptCall(method, object, saveArguments);

    function saveArguments( method, self, args ) {
        // reserve space for the callback, allow the thunk to be invoked multiple times
        args.push(null);

        return function invokeThunk(cb) {
            args[args.length - 1] = cb;
            // thunk caller must catch errors thrown by the method (or the callback)
            return self ? _invoke2(self, method, args) : _invoke1(method, args);
        }
    }
}

/**

// thunkify the function
function thunkify2a( func ) {
    return thunkify2b('fn', {fn: func});
}

// thunkify the named method of the object
// Can thunkify methods either by name or by value.
// Unlike `thunkify`, calling the callback more than once is an error.
// XXX that prevents valid use cases where the callback is invoked multiple times
// XXX hoisting errors into the callback is only valid for callbacks taking an err
function thunkify2b( object, method ) {
    var self = this;
    var invoke = self.invoke;
    var invoke2 = (typeof method === 'function') ? self.invoke2f : self.invoke2;

    return function doSaveArguments() {
        var av = new Array(arguments.length);
        for (var i=0; i<av.length; i++) av[i] = arguments[i];

        if (!object) {
            // if no object, use the object that the thunk is attached to,
            if (this && this !== global) object = this;
            else throw new Error("no context");
        }

        return function doInvoke( callback ) {
            var returned = false;

            av.push(function() {
                if (returned) throw new Error("already returned");
                returned = true;
                switch (arguments.length) {
                case 0: return callback();
                case 1: return callback(arguments[0]);
                case 2: return callback(arguments[0], arguments[1]);
                case 3: return callback(arguments[0], arguments[1], arguments[2]);
                default: return invoke(callback, arguments);
                }
            })

            try {
                invoke2(object, method, av)
            }
            catch (err) {
                // hoist errors from the method into the callback, but
                // re-throw uncaught errors originating within the callback
                if (returned) throw err;
                returned = true;
                callback(err);
            }
        }
    }
}

/**

`thunkify` splits a callbacked method into two functions, the first to build a
closure that will save the method arguments and return the second function, and a
second to take a callback to run the method on the saved arguments.  The thunkified method must take the
tallback as the very last argument.  The first function, saveMethodArgs, must be
called without the final callback, the second function that it returns, runMethod,
with just the final callback.  Note that there are four functions in play:  the
callbacked method, the synchronous saveMethodArgs, the asynchronous runMethod, and
thunkify itself.

**/

/** quicktest:

var timeit = require('qtimeit');
var x;
var fn = function(m, cb) { x = m; cb() };
timeit(1000000, function(){ x = thunkify(fn) });
// 20m/s

var noop = function(){};
var fnt = thunkify(fn);
timeit(1000000, function(){ x = fn("m", noop) });
// 205m/s
timeit(1000000, function(){ x = fnt("m")(noop) });
// 2.35m/s

var write = thunkify(function(m, cb) { console.log(m); cb() });
var run = write("testing 1,1,1...");
run(function(err, ret) {
    console.log("Test 1 done.", err);
})

var write = thunkify2b(process.stdout, 'write');
var run = write("testing 1,2,3...\n");
run(function(err, ret) {
    console.log("test 2 done.", err);
})

/**/
