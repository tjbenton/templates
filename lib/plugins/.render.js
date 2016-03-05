'use strict';

var utils = require('../utils');

module.exports = function(proto) {

  /**
   * Set view types for a collection.
   *
   * @param {String} `plural` e.g. `pages`
   * @param {Object} `options`
   */

  proto.viewType = proto.viewType || function(plural, types) {
    var len = types.length, i = 0;
    while (len--) {
      var type = types[i++];
      this.viewTypes[type] = this.viewTypes[type] || [];
      if (this.viewTypes[type].indexOf(plural) === -1) {
        this.viewTypes[type].push(plural);
      }
    }
    return types;
  };

  /**
   * Iterates over `renderable` view collections
   * and returns the first view that matches the
   * given `view` name
   */

  function findView(app, name) {
    var keys = app.viewTypes.renderable;
    var len = keys.length;
    var i = -1;

    var res = null;
    while (++i < len) {
      res = app.find(name, keys[i]);
      if (res) {
        break;
      }
    }
    return res;
  }

  /**
   * Get a view from the specified collection, or list,
   * or iterate over view collections until the view
   * is found.
   */

  function getView(app, view) {
    if (app.isCollection) {
      view = app.getView(view);

    } else if (app.isList) {
      view = app.getItem(view);

    } else {
      view = findView(app, view);
    }
    return view;
  }

  /**
   * Compile `content` with the given `locals`.
   *
   * ```js
   * var indexPage = app.page('some-index-page.hbs');
   * var view = app.compile(indexPage);
   * // view.fn => [function]
   *
   * // you can call the compiled function more than once
   * // to render the view with different data
   * view.fn({title: 'Foo'});
   * view.fn({title: 'Bar'});
   * view.fn({title: 'Baz'});
   * ```
   *
   * @name .compile
   * @param  {Object|String} `view` View object.
   * @param  {Object} `locals`
   * @param  {Boolean} `isAsync` Load async helpers
   * @return {Object} View object with compiled `view.fn` property.
   * @api public
   */

  function formatArgs(app) {
    return function fn(view, locals, isAsync, cb) {
      if (typeof locals === 'function') {
        return fn(view, {}, false, locals);
      }
      if (typeof isAsync === 'function') {
        return fn(view, locals, false, isAsync);
      }
      if (typeof locals === 'boolean') {
        return fn(view, {}, locals, isAsync);
      }

      // if `view` is a string, see if it's a cached view
      if (typeof view === 'string') {
        view = getView(app, view);
      }

      locals = utils.merge({settings: {}}, locals);

      if (typeof view._context === 'undefined') {
        view._context = view.context(app.context(locals));
      }

      return {
        view: view,
        locals: locals,
        isAsync: isAsync,
        ctx: view._context,
        cb: cb
      };
    };
  }

  proto.compile = function(view, locals, isAsync) {
    var args = formatArgs(this).apply(null, arguments);

    if (typeof args.cb === 'function') {
      throw this.formatError('compile', 'callback');
    }

    locals = args.locals;
    view = args.view;

    // handle `preCompile` middleware
    this.handleOnce('preCompile', view);

    // determine the name of the engine to use
    var ext = utils.resolveEngine(view, locals, this.options);
    // get the actual engine (object)
    var engine = this.getEngine(ext);

    // throw if an engine is not defined
    if (typeof engine === 'undefined') {
      throw this.formatError('compile', 'engine', formatExtError(view, ext));
    }

    // clean up engine name, for consistency
    engine.options.engineName = engine.options.name;
    delete engine.options.name;

    // get engine options (settings)
    var engineOpts = utils.merge({}, locals.settings, engine.options);

    // apply layout
    view = this.applyLayout(view);
    var ctx = args.ctx;

    // Bind context to helpers before passing to the engine.
    this.bindHelpers(view, locals, ctx, (ctx.async = !!args.isAsync));

    // shallow clone the context and locals
    engineOpts = utils.merge({}, ctx, engineOpts, this.mergePartials(engineOpts));

    // compile the string
    view.fn = engine.compile(view.content, engineOpts);

    // handle `postCompile` middleware
    this.handleOnce('postCompile', view);
    return view;
  };

  /**
   * Asynchronously compile `content` with the given `locals` and callback.
   *
   * ```js
   * var indexPage = app.page('some-index-page.hbs');
   * app.compileAsync(indexPage, function(err, view) {
   *   // view.fn => compiled function
   * });
   * ```
   *
   * @name .compileAsync
   * @param  {Object|String} `view` View object.
   * @param  {Object} `locals`
   * @param  {Boolean} `isAsync` Pass true to load helpers as async (mostly used internally)
   * @param {Function} `callback` function that exposes `err` and the `view` object with compiled `view.fn` property
   * @api public
   */

  proto.preCompile = function(view, locals, isAsync, cb) {
    var args = [].slice.call(arguments, 1);

    // if `view` is a string, see if it's a cached view
    if (typeof view === 'string') {
      view = getView(this, view);
    }

    // handle `preCompile` middleware
    this.handle('preCompile', view, function(err, file) {
      if (err) return cb(err);

      return this.compileAsync.bind(this, file).apply(this, args);
    }.bind(this));
  };

  proto.compileAsync = function(view, locals, isAsync, cb) {
    var args = formatArgs(this).apply(null, arguments);
    var ctx = args.ctx;

    cb = args.cb;
    isAsync = args.isAsync;
    locals = args.locals;
    view = args.view;

    var app = this;

    // handle `preCompile` middleware
    this.handle('preCompile', view, function(err, file) {
      if (err) return cb(err);

      // determine the name of the engine to use
      var ext = utils.resolveEngine(file, ctx, app.options);

      // get the actual engine (object)
      var engine = app.getEngine(ext);

      if (typeof engine === 'undefined') {
        cb(app.formatError('compile', 'engine', formatExtError(file, ext)));
        return;
      }

      engine.options.engineName = engine.options.name;
      delete engine.options.name;

      // get engine options (settings)
      var engineOpts = utils.merge({}, locals.settings, engine.options);

      // apply layout
      app.applyLayoutAsync(file, function(err, view) {
        if (err) return cb(err);

        // Bind context to helpers before passing to the engine.
        app.bindHelpers(view, locals, ctx, (ctx.async = !!isAsync));

        app.mergePartialsAsync(engineOpts, function(err, partials) {
          if (err) return cb(err);

          // shallow clone the context and engineOpts
          var mergedSettings = utils.merge({}, engineOpts, ctx, partials);

          if (view.engineStack.hasOwnProperty(ext)) {
            view.fn = view.engineStack[ext];
          } else {
            // compile the string
            view.fn = engine.compile(view.content, mergedSettings);
            utils.engineStack(view, ext, view.fn);
          }

          // handle `postCompile` middleware
          app.handle('postCompile', view, cb);
        });
      });
    });
  };

  /**
   * Render a view with the given `locals` and `callback`.
   *
   * ```js
   * var blogPost = app.post.getView('2015-09-01-foo-bar');
   * app.render(blogPost, {title: 'Foo'}, function(err, view) {
   *   // `view` is an object with a rendered `content` property
   * });
   * ```
   * @name .render
   * @param  {Object|String} `view` Instance of `View`
   * @param  {Object} `locals` Locals to pass to template engine.
   * @param  {Function} `callback`
   * @api public
   */

  proto.render = function(view, locals, cb) {
    if (typeof locals === 'function') {
      cb = locals;
      locals = {};
    }

    if (typeof cb !== 'function') {
      throw this.formatError('render', 'callback');
    }

    // if `view` is a string, see if it's a cached view
    if (typeof view === 'string') {
      view = getView(this, view);
    }

    var ctx = view.context(this.context(locals));
    var app = this;

    // handle `preRender` middleware
    this.handle('preRender', view, function(err, file) {
      if (err) return cb(err);

      // get the engine
      var ext = utils.resolveEngine(file, ctx, app.options);
      var engine = app.getEngine(ext);

      if (!engine) {
        cb(app.formatError('render', 'engine', formatExtError(file, ext)));
        return;
      }

      // since we already merged context, add it to a non-enumerable
      // property so it can be used by `compile`
      utils.define(file, '_context', ctx);

      // compile the view
      app.compileAsync(file, ctx, true, function(err, view) {
        if (err) return cb(err);

        // build the context one more time in case it has changed
        var context = view.context(ctx);

        // render the view
        engine.render(view.fn, context, function(err, res) {
          if (err) {
            // rethrow is a noop if `options.rethrow` is not true
            var renderErr = app.rethrow('render', err, view, context);
            app.emit('error', renderErr || err);
            cb(err);
            return;
          }

          view.localsStack.push(locals);
          view.content = res;

          // handle `postRender` middleware
          app.handle('postRender', view, cb);
        });
      });
    });
  };
};

function formatExtError(view, ext) {
  if (ext && typeof ext === 'string' && ext.trim()) {
    return ext;
  }
  return view.basename;
}