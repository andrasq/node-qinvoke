/**
 * Copyright (C) 2017 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var qinvoke = require('./');

function globalFunc(a, b, cb) {
    return cb(null, a + b);
}

module.exports = {

    'interceptCall': {

        'shoul error if no handler function': function(t) {
            t.expect(3);
            t.throws(function() { qinvoke.interceptCall() });
            t.throws(function() { qinvoke.interceptCall(function(){}) });
            t.throws(function() { qinvoke.interceptCall(function(){}, {}) });
            t.done();
        },

        'should intercept function': function(t) {
            var called = false, fn = function() {};
            qinvoke.interceptCall(fn, function handler(func, obj, args) {
                t.deepEqual(args, [1,2,3]);
                t.done();
            })(1, 2, 3);
        },

        'should intercept method': function(t) {
            var obj = {
                method: Math.random() * 0x1000000,
            };
            t.expect(4);
            qinvoke.interceptCall(obj.method, obj, function(meth, obj, argv) {
                t.equal(meth, obj.method);
                t.deepEqual(argv, [1, 2]);
            })(1,2);
            qinvoke.interceptCall('method', obj, function(meth, obj, argv) {
                t.equal(meth, 'method');
                t.deepEqual(argv, [3, 4]);
            })(3,4);
            t.done();
        },

        'should return arguments': function(t) {
            var fn = qinvoke.interceptCall(null, null, function(func, obj, args) {
                return args;
            });
            t.deepEqual(fn(), []);
            t.deepEqual(fn(1), [1]);
            t.deepEqual(fn(1,2), [1, 2]);
            t.deepEqual(fn(1,2,3), [1, 2, 3]);
            t.deepEqual(fn(1,fn,2), [1, fn, 2]);
            t.deepEqual(fn(1,2,3,4,5,6,7,8), [1,2,3,4,5,6,7,8]);
            t.done();
        },
    },

    'invoke': {

        setUp: function(done) {
            this.testArgs = [
                [],
                [1], ["a"],
                [1, 2], ["a", {b: 2}],
                [1, 2, 3], ["a", {b: 2}, 3.5],
                [1, 2, 3, 4],
                [1, 2, 3, 4, 5],
                [1, function(){}, 3, 4, {f: {ff: 5}}, 6, 7, 8, 9, 10],
            ];
            done();
        },

        'should pass arguments to function': function(t) {
            var fn = qinvoke.interceptCall(null, null, function(fn, obj, args) {
                return args;
            });
            for (var i=0; i<this.testArgs.length; i++) {
                t.deepEqual(qinvoke.invoke(fn, this.testArgs[i]), this.testArgs[i]);
            }
            t.done();
        },

        'should pass arguments to named method': function(t) {
            var obj = {
                'someMethod': qinvoke.interceptCall(null, null, function(fn, obj, args) {
                    return args;
                }),
            };
            for (var i=0; i<this.testArgs.length; i++) {
                t.deepEqual(qinvoke.invoke2(obj, 'someMethod', this.testArgs[i]), this.testArgs[i]);
            }
            t.done();
        },

        'should pass arguments to method body': function(t) {
            var obj = {
                'someMethod': qinvoke.interceptCall(null, null, function(fn, obj, args) {
                    return args;
                }),
            };
            for (var i=0; i<this.testArgs.length; i++) {
                t.deepEqual(qinvoke.invoke2f(obj, obj.someMethod, this.testArgs[i]), this.testArgs[i]);
            }
            t.done();
        },

        'should be fast': function(t) {
            var fn = function(a, b) { return a + b };
            var obj = { fn: fn };
            var argv = [1, 2];
            var argv2 = [1, 2, 3, 4];
            var t1 = Date.now();
            for (var i=0; i<10000000; i++) qinvoke.invoke(fn, argv);
            //for (var i=0; i<10000000; i++) qinvoke.invoke2(obj, 'fn', argv);
            //for (var i=0; i<10000000; i++) qinvoke.invoke2f(obj, obj.fn, argv);
            //for (var i=0; i<10000000; i++) qinvoke.invokeAny(fn, argv, null);
            //for (var i=0; i<10000000; i++) qinvoke.invoke2Any(obj.fn, obj, argv);
            //for (var i=0; i<10000000; i++) qinvoke.invoke2Any('fn', obj, argv);
            var t2 = Date.now();
            //console.log("AR: 10m invoke() in %d ms", t2 - t1);
            // SKL 4.5g node-v6.7.0:
            //     invoke 2 args: 10m calls in 81 ms (123m/s direct), 4 args: 10m in 176ms (57m/s .apply)
            //     invoke2 2 args: 10m in 112 ms (89m/s direct named), 4 args: 10m in 181 ms (55m/s .apply)
            //     invoke2f 2 args: 10m in 84 ms (119m/s .call), 4 args: 10m in 157 ms (64m/s .apply)
            //     invokeAny 2 args: 10m in 123ms if *missing third arg*, 92ms if have third arg (!!) (node-v0.10 same, 125 vs 93)
            //     invoke2Any direct 2 args: 10m in 94ms (106m/s .call), 4 args: 10m in 164 ms (61m/s .apply)
            //     invoke2Any named 2 args: 10m in 122ms (82m/s direct named), 4 args: 10m in 188ms (53m/s .apply)
            // SKL 4.5g node-v7.5.0:
            //     invoke 2 args: 10m in 75 ms (133m/s .call), 4 args: 10m in 155 ms (65m/s)
            //     invoke2 2 args: 10m in 125 ms (80m/s), 4 args: 10m in 191ms (52m/s)
            //     invoke2f 2 args: 10m in 83 ms (120m/s), 4 args: 10m in 157ms (64m/s)
            //     XXX 123ms vs 87ms to pass the expected number of arguments
            // SKL 4.5g node-v0.10.42:
            //     invoke 2 args: 10m in 82 ms (122m/s direct), 4 args: 10m in 298ms (34m/s .apply)
            //     invoke2 2 args: 10m in 82 ms (122m/s direct named), 4 args: 10m in 298ms (34m/s .apply)
            //     invoke2f 2 args: 10m in 104 ms (96m/s .call), 4 args: 10m in 292ms (34m/s .apply)
            // Phenom 3.6g node-v0.10.42:
            //     invoke direct: 100m/s, .apply: 13m/s
            //     invoke2 direct: 60m/s, .apply: 16m/s
            //     invoke2f direct: 40m/s, .apply: 16m/s
            t.done();
        },
    },

    'thunkify': {

        'should require a function, method or method name': function(t) {
            var obj = { method: function() {} };
            t.equal(typeof qinvoke.thunkify(function(){}), 'function');
            t.equal(typeof qinvoke.thunkify(globalFunc), 'function');
            t.equal(typeof qinvoke.thunkify(obj.method, obj), 'function');
            t.equal(typeof qinvoke.thunkify(obj.method, obj), 'function');
            t.equal(typeof qinvoke.thunkify('method', obj), 'function');
            t.throws(function() { qinvoke.thunkify('globalFunction') });
            t.done();
        },

        'should return a thunk function': function(t) {
            var fn = qinvoke.thunkify(function(){});
            t.equal(typeof fn, 'function');
            t.done();
        },

        'invoking thunk should return a function': function(t) {
            var fn = qinvoke.thunkify(function(){});
            var thunk = fn(1, 2);
            t.equal(typeof thunk, 'function');
            t.done();
        },

        'invoking thunk return value should run thunkified function': function(t) {
            t.expect(2);
            var func = function(p1, p2, cb) {
                t.equal(p1, 11);
                t.equal(p2, 22);
                cb();
            }
            var thunk = qinvoke.thunkify(func)(11, 22);
            thunk(function cb() {
                t.done();
            })
        },

        'should thunkify global function by name and value': function(t) {
            var thunk = qinvoke.thunkify(globalFunc);
            thunk(1, 2)(function(err, ret) {
                t.equal(ret, 3);
                t.done();
            })
        },

        'should thunkify method by name and value': function(t) {
            var obj = {
                method: function(a, b, cb) { cb(3) },
            };
            t.expect(2);
            var thunk = qinvoke.thunkify('method', obj);
            thunk(1, 2)(function cb(c) {
                t.equal(c, 3);
            })
            var thunk = qinvoke.thunkify(obj.method, obj);
            thunk(1, 2)(function cb(c) {
                t.equal(c, 3);
                t.done();
            })
        },
    },

    'once': {

        'should suppress second call': function(t) {
            var called = false;
            var fn = function(){ called = true };
            var test = qinvoke.once(fn);

            t.ok(!called);
            test();
            t.ok(called);

            called = false;
            test();
            t.ok(!called);

            t.done();
        },

        'should pass arguments': function(t) {
            var tests = [
                [],
                [1],
                [1, 2],
                [1, 2, 3],
                [1, 2, 3, 4],
                [1, 2, 3, 4, 5],
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            ];
            var argv;
            var fn = function() {
                argv = Array.prototype.slice.call(arguments, 0);
            }
            for (var i=0; i<tests.length; i++) {
                argv = null;
                var test = qinvoke.once(fn);
                test.apply(null, tests[i]);
                t.deepEqual(argv, tests[i]);
                argv = null;
                test.apply(tests[i]);
                t.strictEqual(argv, null);
            }
            t.done();
        },

        'test speed': function(t) {
            var t1 = Date.now();
            for (var i=0; i<10000; i++) {
                var fn = qinvoke.once(function(a, b) { return a + b });
            }
            var t2 = Date.now();
            //console.log("AR: 100k once in %d ms", t2 - t1);
            // 55m/s create and run
            t.done();
        },
    },

    'errorToObject': {

        'should not convert non-objects': function(t) {
            var x;
            t.strictEqual(qinvoke.errorToObject(x = undefined), x);
            t.strictEqual(qinvoke.errorToObject(x = null), x);
            t.strictEqual(qinvoke.errorToObject(x = 1234.5), x);
            t.strictEqual(qinvoke.errorToObject(x = "test"), x);
            t.done();
        },

        'should not convert non-Errors in strict mode': function(t) {
            var x;
            t.strictEqual(qinvoke.errorToObject(x = {a:1}, true), x);
            t.done();
        },

        'should convert Errors in strict mode': function(t) {
            var x = new Error();
            x.a = 123;
            t.ok(qinvoke.errorToObject(x) !== x);
            t.ok(qinvoke.errorToObject(x).a === 123);
            t.done();
        },

        'should convert Error to object': function(t) {
            var err = new TypeError("deliberate error");
            var obj = qinvoke.errorToObject(err);
            t.equal(obj.message, "deliberate error");
            t.equal(obj._eConstructor__, "TypeError");
            t.ok(obj.stack);
            t.done();
        },

        'should convert non-Error object to object': function(t) {
            var err = { a: 1, b: 2, c: 3 };
            var obj = qinvoke.errorToObject(err);
            t.equal(obj._eConstructor__, undefined);
            delete(obj._isError__);
            t.deepEqual(obj, err);
            t.done();
        },

        'should copy out non-enumerable error fields': function(t) {
            var err = new Error();
            err.code = 'ENOENT';
            err.syscall = 'open';
            Object.defineProperty(err, 'code', { enumerable: false });
            Object.defineProperty(err, 'syscall', { enumerable: false });
            var obj = qinvoke.errorToObject(err);
            t.ok('code' in obj);
            t.ok(Object.keys(obj).indexOf('code') >= 0);
            t.done();
        },

        'should convert object back to Error': function(t) {
            var err = new TypeError("deliberate error");
            var obj = qinvoke.errorToObject(err);
            var err2 = qinvoke.objectToError(obj);
            t.ok(err2 instanceof TypeError);
            t.strictEqual(err2.message, "deliberate error");
            // sort the property names, node-v0.10 can return them out of order
            t.deepEqual(Object.getOwnPropertyNames(err2).sort(), Object.getOwnPropertyNames(err).sort());
            t.done();
        },

    },

    'objectToError': {

        'shuold not convert falsy objects': function(t) {
            var x;
            t.strictEqual(qinvoke.objectToError(x = undefined, true), x);
            t.strictEqual(qinvoke.objectToError(x = null, true), x);
            t.strictEqual(qinvoke.objectToError(x = "", true), x);
            t.strictEqual(qinvoke.objectToError(x = 0, true), x);
            t.done();
        },

        'should not convert non-errors in strict mode': function(t) {
            var x;
            t.strictEqual(qinvoke.objectToError(x = undefined, true), x);
            t.strictEqual(qinvoke.objectToError(x = null, true), x);
            t.strictEqual(qinvoke.objectToError(x = 1234.5, true), x);
            t.strictEqual(qinvoke.objectToError(x = "test string", true), x);
            t.strictEqual(qinvoke.objectToError(x = /foo/i, true), x);
            t.strictEqual(qinvoke.objectToError(x = {a:1, b:{}}, true), x);
            t.done();
        },

        'should make standard hidden fields non-enumerable': function(t) {
            var err = qinvoke.objectToError({ code: 'ENOENT', syscall: 'open' });
            t.equal(err.code, 'ENOENT');
            t.equal(err.syscall, 'open');
            t.ok(Object.keys(err).indexOf('code') < 0);
            t.ok(Object.keys(err).indexOf('syscall') < 0);
            t.done();
        },

        'should convert plain object back Error': function(t) {
            var err = qinvoke.objectToError({a:123, message: "test error"});
            t.ok(err.message !== undefined);
            t.ok(err.stack !== undefined);
            t.ok(err instanceof Error);
            t.ok(! ('_eConstructor__' in err));
            t.equal(err.a, 123);
            t.done();
        },

        'should ensure that message and stack are set': function(t) {
            var err = qinvoke.objectToError({});
            t.equal(typeof err.message, 'string');
            t.equal(typeof err.stack, 'string');
            t.equal(err.stack.indexOf("Error\n"), 0);
            t.ok(! ('_eConstructor__' in err));
            t.done();
        },
    }

}
