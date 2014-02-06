
/* python-like zip
*/

(function() {

  window.zip = function() {
    var args, shortest;
    args = [].slice.call(arguments);
    shortest = args.length === 0 ? [] : args.reduce((function(a, b) {
      if (a.length < b.length) {
        return a;
      } else {
        return b;
      }
    }));
    return shortest.map((function(_, i) {
      return args.map(function(array) {
        return array[i];
      });
    }));
  };

}).call(this);
