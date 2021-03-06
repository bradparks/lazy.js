/**
 * Wraps an object and returns a {@link Sequence}.
 *
 * - For **arrays**, Lazy will create a sequence comprising the elements in
 *   the array (an {@link ArrayLikeSequence}).
 * - For **objects**, Lazy will create a sequence of key/value pairs
 *   (an {@link ObjectLikeSequence}).
 * - For **strings**, Lazy will create a sequence of characters (a
 *   {@link StringLikeSequence}).
 *
 * @param {Array|Object|string} source An array, object, or string to wrap.
 * @return {Sequence} The wrapped lazy object.
 *
 * @example
 * var fromArray = Lazy([1, 2, 4]);
 * // => Lazy.ArrayLikeSequence
 *
 * var fromObject = Lazy({ foo: "bar" });
 * // => Lazy.ObjectLikeSequence
 *
 * var fromString = Lazy("hello, world!");
 * // => Lazy.StringLikeSequence
 */
var Lazy = function(source) {
  if (source instanceof Array) {
    return new ArrayWrapper(source);
  } else if (typeof source === "string") {
    return new StringWrapper(source);
  } else if (source instanceof Sequence) {
    return source;
  }
  return new ObjectWrapper(source);
};

/**
 * Creates a {@link GeneratedSequence} using the specified generator function
 * and (optionally) length.
 *
 * @param {function(number):*} generatorFn The function used to generate the
 *     sequence. This function accepts an index as a parameter and should return
 *     a value for that index in the resulting sequence.
 * @param {number=} length The length of the sequence, for sequences with a
 *     definite length.
 * @return {GeneratedSequence} The generated sequence.
 *
 * @example
 * var randomNumbers = Lazy.generate(Math.random);
 * // => sequence: (0.4838115070015192, 0.637410914292559, ...)
 *
 * randomNumbers.length();
 * // => undefined
 *
 * var countingNumbers = Lazy.generate(function(i) { return i + 1; }, 10);
 * // => sequence: (1, 2, ..., 10)
 *
 * countingNumbers.length();
 * // => 10
 */
Lazy.generate = function(generatorFn, length) {
  return new GeneratedSequence(generatorFn, length);
};

/**
 * Creates a sequence from a given starting value, up to a specified stopping
 * value, incrementing by a given step.
 *
 * @return {GeneratedSequence} The sequence defined by the given ranges.
 *
 * @example
 * var integers = Lazy.range(10);
 * // => sequence: (0, 1, ..., 9)
 *
 * var countingNumbers = Lazy.range(1, 11);
 * // => sequence: (1, 2, ..., 10)
 *
 * var evenNumbers = Lazy.range(2, 10, 2);
 * // => sequence: (2, 4, 6, 8)
 */
Lazy.range = function() {
  var start = arguments.length > 1 ? arguments[0] : 0,
      stop  = arguments.length > 1 ? arguments[1] : arguments[0],
      step  = arguments.length > 2 ? arguments[2] : 1;
  return this.generate(function(i) { return start + (step * i); })
    .take(Math.floor((stop - start) / step));
};

/**
 * Creates a sequence consisting of the given value repeated a specified number
 * of times.
 *
 * @param {*} value The value to repeat.
 * @param {number=} count The number of times the value should be repeated in
 *     the sequence. If this argument is omitted, the value will repeat forever.
 * @return {GeneratedSequence} The sequence containing the repeated value.
 *
 * @example
 * var hihihi = Lazy.repeat("hi", 3);
 * // => sequence: ("hi", "hi", "hi")
 *
 * var foreverYoung = Lazy.repeat("young");
 * // => sequence: ("young", "young", ...)
 */
Lazy.repeat = function(value, count) {
  return Lazy.generate(function() { return value; }, count);
};

Lazy.Sequence = Sequence;
Lazy.ArrayLikeSequence = ArrayLikeSequence;
Lazy.ObjectLikeSequence = ObjectLikeSequence;
Lazy.StringLikeSequence = StringLikeSequence;
Lazy.GeneratedSequence = GeneratedSequence;
Lazy.AsyncSequence = AsyncSequence;

/*** Useful utility methods ***/

/**
 * Creates a Set containing the specified values.
 *
 * @param {...Array} values One or more array(s) of values used to populate the
 *     set.
 * @return {Set} A new set containing the values passed in.
 */
function createSet(values) {
  var set = new Set();
  Lazy(values || []).flatten().each(function(e) {
    set.add(e);
  });
  return set;
};

/**
 * Compares two elements for sorting purposes.
 *
 * @param {*} x The left element to compare.
 * @param {*} y The right element to compare.
 * @param {Function=} fn An optional function to call on each element, to get
 *     the values to compare.
 * @return {number} 1 if x > y, -1 if x < y, or 0 if x and y are equal.
 */
function compare(x, y, fn) {
  if (typeof fn === "function") {
    return compare(fn(x), fn(y));
  }

  if (x === y) {
    return 0;
  }

  return x > y ? 1 : -1;
}

/**
 * Iterates over every individual element in an array of arrays (of arrays...).
 *
 * @param {Array} array The outermost array.
 * @param {Function} fn The function to call on every element, which can return
 *     false to stop the iteration early.
 * @param {Array=} index An optional counter container, to keep track of the
 *     current index.
 * @return {boolean} True if every element in the entire sequence was iterated,
 *     otherwise false.
 */
function recursiveForEach(array, fn, index) {
  // It's easier to ensure this is initialized than to add special handling
  // in case it isn't.
  index = index || [0];

  var i = -1;
  while (++i < array.length) {
    if (array[i] instanceof Array) {
      if (recursiveForEach(array[i], fn, index) === false) {
        return false;
      }
    } else {
      if (fn(array[i], index[0]++) === false) {
        return false;
      }
    }
  }
  return true;
}

function getFirst(sequence) {
  var result;
  sequence.each(function(e) {
    result = e;
    return false;
  });
  return result;
}

function contains(array, element) {
  var i = -1,
      length = array.length;

  while (++i < length) {
    if (array[i] === element) {
      return true;
    }
  }
  return false;
}

function containsBefore(array, element, index) {
  var i = -1;

  while (++i < index) {
    if (array[i] === element) {
      return true;
    }
  }
  return false;
}

function swap(array, i, j) {
  var temp = array[i];
  array[i] = array[j];
  array[j] = temp;
}

function indent(depth) {
  return new Array(depth).join("  ");
}

/**
 * A collection of unique elements.
 *
 * @constructor
 */
function Set() {
  this.table = {};
}

/**
 * Attempts to add a unique value to the set.
 *
 * @param {*} value The value to add.
 * @return {boolean} True if the value was added to the set (meaning an equal
 *     value was not already present), or else false.
 */
Set.prototype.add = function(value) {
  var table = this.table,
      type  = typeof value,

      // only applies for strings
      firstChar,

      // only applies for objects
      objects;

  switch (type) {
    case "number":
    case "boolean":
    case "undefined":
      if (!table[value]) {
        table[value] = true;
        return true;
      }
      return false;

    case "string":
      // Essentially, escape the first character if it could possibly collide
      // with a number, boolean, or undefined (or a string that happens to start
      // with the escape character!), OR if it could override a special property
      // such as '__proto__' or 'constructor'.
      firstChar = value.charAt(0);
      if ("_ftc@".indexOf(firstChar) >= 0 || (firstChar >= "0" && firstChar <= "9")) {
        value = "@" + value;
      }
      if (!table[value]) {
        table[value] = true;
        return true;
      }
      return false;

    default:
      // For objects and functions, we can't really do anything other than store
      // them in an array and do a linear search for reference equality.
      objects = this.objects;
      if (!objects) {
        objects = this.objects = [];
      }
      if (!contains(objects, value)) {
        objects.push(value);
        return true;
      }
      return false;
  }
};

/**
 * Checks whether the set contains a value.
 *
 * @param {*} value The value to check for.
 * @return {boolean} True if the set contains the value, or else false.
 */
Set.prototype.contains = function(value) {
  var type = typeof value,

      // only applies for strings
      firstChar;

  switch (type) {
    case "number":
    case "boolean":
    case "undefined":
      return !!this.table[value];

    case "string":
      // Essentially, escape the first character if it could possibly collide
      // with a number, boolean, or undefined (or a string that happens to start
      // with the escape character!), OR if it could override a special property
      // such as '__proto__' or 'constructor'.
      firstChar = value.charAt(0);
      if ("_ftc@".indexOf(firstChar) >= 0 || (firstChar >= "0" && firstChar <= "9")) {
        value = "@" + value;
      }
      return !!this.table[value];

    default:
      // For objects and functions, we can't really do anything other than store
      // them in an array and do a linear search for reference equality.
      return this.objects && contains(this.objects, value);
  }
};

/*** Exposing Lazy to the world ***/

// For Node.js
if (typeof module !== "undefined") {
  module.exports = Lazy;

// For browsers
} else {
  context.Lazy = Lazy;
}
