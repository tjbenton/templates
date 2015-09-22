'use strict';

var utils = require('../utils');

module.exports = function (proto) {

  /**
   * Find a view by `name`, optionally passing a `collection` to limit
   * the search. If no collection is passed all `renderable` collections
   * will be searched.
   *
   * ```js
   * var page = app.find('my-page.hbs');
   *
   * // optionally pass a collection name as the second argument
   * var page = app.find('my-page.hbs', 'pages');
   * ```
   * @name .find
   * @param {String} `name` The name/key of the view to find
   * @param {String} `colleciton` Optionally pass a collection name (e.g. pages)
   * @return {Object|undefined} Returns the view if found, or `undefined` if not.
   * @api public
   */

  proto.find = function (name, collection) {
    if (typeof name !== 'string') {
      throw new TypeError('expected name to be a string.');
    }
    if (typeof collection === 'string') {
      return this[collection].getView(name);
    }
    var collections = this.viewTypes.renderable;
    var len = collections.length, i = 0;
    while (len--) {
      var plural = collections[i++];
      var views = this.views[plural];
      var res;
      if (res = views[name]) {
        return res;
      }
    }
  };

  /**
   * Get view `key` from the specified `collection`.
   *
   * ```js
   * var view = app.getView('pages', 'a/b/c.hbs');
   *
   * // optionally pass a `renameKey` function to modify the lookup
   * var view = app.getView('pages', 'a/b/c.hbs', function(fp) {
   *   return path.basename(fp);
   * });
   * ```
   * @name .getView
   * @param {String} `collection` Collection name, e.g. `pages`
   * @param {String} `key` Template name
   * @param {Function} `fn` Optionally pass a `renameKey` function
   * @return {Object}
   * @api public
   */

  proto.getView = function(collection, key, fn) {
    var views = this.getViews(collection);
    // use custom renameKey function
    if (typeof fn === 'function') {
      key = fn(key);
    }
    if (views.hasOwnProperty(key)) {
      return views[key];
    }
    // try again with the default renameKey function
    fn = this.option('renameKey');
    var name;
    if (typeof fn === 'function') {
      name = fn.call(this, key);
    }
    if (name && name !== key && views.hasOwnProperty(name)) {
      return views[name];
    }
    return null;
  };

  /**
   * Get all views from a `collection` using the collection's
   * singular or plural name.
   *
   * ```js
   * var pages = app.getViews('pages');
   * //=> { pages: {'home.hbs': { ... }}
   *
   * var posts = app.getViews('posts');
   * //=> { posts: {'2015-10-10.md': { ... }}
   * ```
   *
   * @name .getViews
   * @param {String} `name` The collection name, e.g. `pages` or `page`
   * @return {Object}
   * @api public
   */

  proto.getViews = function(name) {
    var orig = name;
    if (utils.isObject(name)) return name;
    if (!this.views.hasOwnProperty(name)) {
      name = this.inflections[name];
    }
    if (!this.views.hasOwnProperty(name)) {
      throw new Error('getViews cannot find collection: ' + orig);
    }
    return this.views[name];
  };

  /**
   * Returns the first view from `collection` with a key
   * that matches the given glob pattern.
   *
   * ```js
   * var pages = app.matchView('pages', 'home.*');
   * //=> {'home.hbs': { ... }, ...}
   *
   * var posts = app.matchView('posts', '2010-*');
   * //=> {'2015-10-10.md': { ... }, ...}
   * ```
   *
   * @name .matchView
   * @param {String} `collection` Collection name.
   * @param {String} `pattern` glob pattern
   * @param {Object} `options` options to pass to [micromatch][]
   * @return {Object}
   * @api public
   */

  proto.matchView = function(collection, pattern, options) {
    var views = this.getViews(collection);
    if (views.hasOwnProperty(pattern)) {
      return views[pattern];
    }
    return utils.matchKey(views, pattern, options);
  };

  /**
   * Returns any views from the specified collection with keys
   * that match the given glob pattern.
   *
   * ```js
   * var pages = app.matchViews('pages', 'home.*');
   * //=> {'home.hbs': { ... }, ...}
   *
   * var posts = app.matchViews('posts', '2010-*');
   * //=> {'2015-10-10.md': { ... }, ...}
   * ```
   *
   * @name .matchViews
   * @param {String} `collection` Collection name.
   * @param {String} `pattern` glob pattern
   * @param {Object} `options` options to pass to [micromatch]
   * @return {Object}
   * @api public
   */

  proto.matchViews = function(collection, pattern, options) {
    var views = this.getViews(collection);
    return utils.matchKeys(views, pattern, options);
  };
};