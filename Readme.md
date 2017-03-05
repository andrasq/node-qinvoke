qinvoke
=======

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

Apply the function to the arguments.

### invoke2( object, methodName, argv )

Invoke the method on the arguments by name.

### invoke2f (object, method, argv )

Invoke the method on the arguments.

### interceptCall( func, [self,] handler(func, self, argv) )

Return a function that gathers up its arguments and invokes the handler
with the given `func`, `self`, and the call arguments.

    var qinvoke = require('qinvoke');
    function spy( func ) {
        return qinvoke.interceptCall(func, null, function(func, self, argv) {
            console.log("calling %s with", func.name, argv);
            return func.call(self, argv);
        })
    }
    console.log2 = spy(console.log);
    console.log2("testing", 1, 2, 3);
    // => calling bound  with [ 'testing', 1, 2, 3 ]
    // => [ 'testing', 1, 2, 3 ]

### thunkify( method [,object] )

Split the method into two functions, one to partially apply the function to the
arguments (the thunk) and to return the other (the invoke) that runs the function
when called with a callback.

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


Todo
----

- pick more descriptive names
- not clear there is much benefit to passing in the context to the `intercept` handler
