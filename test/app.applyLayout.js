require('should');
require('mocha');
var path = require('path');
var assert = require('assert');
var App = require('../');
var app;
var page = {
  content: '<%= name %>',
  layout: 'default.tmpl',
  locals: {
    name: 'Halle'
  }
};

describe('helpers', function () {
  describe('rendering', function () {
    beforeEach(function () {
      app = new App();
      app.engine('tmpl', require('engine-base'));
      app.create('layout', {viewType: 'layout'});
      app.create('page');
    });

    it('should throw an error when a layout cannot be found:', function (done) {
      app.layout('fofof.tmpl', {content: '..'});
      app.page('a.tmpl', page)
        .render(function (err, res) {
          assert(err.message === 'cannot find layout: default.tmpl');
          done();
        });
    });

    it('should emit an error when a layout cannot be found:', function (done) {
      app.layout('fofof.tmpl', {content: '..'});
      app.on('error', function (err) {
        assert(err.message === 'cannot find layout: default.tmpl');
        done();
      });
      app.page('a.tmpl', page)
        .render(function (err, res) {
        });
    });

    it('should throw an error - layout defined but no layouts registered:', function (done) {
      app.page('a.tmpl', page)
        .render(function (err, res) {
          assert(err.message === 'no layouts are registered.');
          done();
        });
    });

    it('should emit an error - layout defined but no layouts registered:', function (done) {
      app.on('error', function (err) {
        assert(err.message === 'no layouts are registered.');
        done();
      });
      app.page('a.tmpl', page)
        .render(function (err, res) {
        });
    });

    it('should wrap a view with a layout (view.render):', function (done) {
      app.layout('default.tmpl', {content: 'before {% body %} after'});
      app.page('a.tmpl', page)
        .render(function (err, res) {
          if (err) return done(err);
          done();
        });
    });

    it('should wrap a view with a layout (app.render):', function (done) {
      app.layout('default.tmpl', {content: 'before {% body %} after'});
      app.page('a.tmpl', page);

      var view = app.pages.getView('a.tmpl');
      app.render(view, function (err, res) {
        if (err) return done(err);
        assert(res.contents.toString() === 'before Halle after');
        done();
      });
    });

    it('should throw an error when a defined layout is not applied:', function (done) {
      app.layout('no_body_tag.tmpl', {content: 'who? me?'});
      page.layout = 'no_body_tag.tmpl';
      app.page('a.tmpl', page)
        .render(function (err, res) {
          assert(err.message === 'cannot find layout tag "body" in "no_body_tag.tmpl"');
          done();
        });
    });

    it('should emit an error when a defined layout is not applied:', function (done) {
      app.on('error', function (err) {
        assert(err.message === 'cannot find layout tag "body" in "no_body_tag.tmpl"');
        done();
      });
      page.layout = 'no_body_tag.tmpl';
      app.layout('no_body_tag.tmpl', {content: 'who? me?'});
      app.page('a.tmpl', page)
        .render(function (err, res) {
        });
    });
  });
});

