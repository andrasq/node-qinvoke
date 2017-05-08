qinvoke
=======

[![Build Status](https://travis-ci.org/andrasq/node-qinvoke.svg?branch=master)](https://travis-ci.org/andrasq/node-qinvoke)
[![Coverage Status](https://coveralls.io/repos/github/andrasq/node-qinvoke/badge.svg?branch=master)](https://coveralls.io/github/andrasq/node-qinvoke?branch=master)

Quick arguments gathering and function invocation.

Example

    var qinvoke = require('qinvoke');
    function thunkify(func) {
        return qinvoke.interceptCall(func, function handler(func, self, argv) {
            argv.push(null);
            return function(cb) {
                argv[argv.length - 1] = cb;
                return qinvoke.invoke(func, argv);
            }
        })
    }

API
---

### invoke( func, argv )

Apply the function to the arguments.  Like `func.apply(null, argv)`, but much
faster.

### invoke2( object, methodName, argv )

Invoke the method on the arguments by name.  Like `object[methodName].apply(object,
argv)`, but faster.

### invoke2f (object, method, argv )

Invoke the method on the arguments.  Like `method.apply(object, argv)`, but much
faster.

### interceptCall( func, [self,] handler(func, self, argv) )

Return a function that gathers up its arguments and invokes the handler
with the given `func`, `self`, and the call arguments.

    var qinvoke = require('qinvoke');
    function spy( func ) {
        return qinvoke.interceptCall(func, null, function(func, self, argv) {
            console.log("calling %s with", func.name, argv);
            return func.apply(self, argv);
        })
    }
    console.log2 = spy(console.log);
    console.log2("testing", 1, 2, 3);
    // => calling bound  with [ 'testing', 1, 2, 3 ]
    // => [ 'testing', 1, 2, 3 ]

### thunkify( method [,object] )

Split the method into two functions, one (the `thunk`) to partially apply the
function to the arguments and to return the other (the `invoke`) that runs the
function when called with a callback.  `thunkify` returns the thunk.

If `object` is not specified, `method` has to be a function body.  With an
`object`, `method` can be a method name or method body.

For example, thunkify would convert

    func(a, b, cb)

into

    function thunk(a, b) {
        return function invoke(cb) {
            return func(a, b, cb)
        }
    }


### once( func )

Return a function that will invoke `func` at most once.  Subsequent calls are suppressed.
Errors thrown in func are not caught.

### errorToObject( err [,errorsOnly] )

Convert the `Error` with its non-enumerable fields into a serializable object.
The object can be converted back into an Error with `objectToError`.

### objectToError( obj [,errorsOnly] )

Convert the object back into `Error` it represents.  The conversion is reversible
for the primitive errors of `Error`, `RangeError`, `ReferenceError`, `SyntaxError`
and `TypeError`, and errors with global constructors.


Todo
----

- pick more descriptive names
- not clear there is much benefit to passing in the context to the `intercept` handler
