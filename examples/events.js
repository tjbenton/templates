'use strict';

var path = require('path');
var templates = require('..');
var app = templates();

app.create('pages');
app.create('partials', {viewType: 'partial'});

app.on('view', function(view, type) {
  console.log('view:', type || 'collection', '>', view);
});

app.on('page', function(view) {
  console.log('page >', view);
});

app.on('partial', function(view) {
  console.log('partial >', view);
});

app.page('a', {content: 'this is a'});
app.page('b', {content: 'this is b'});
app.page('c', {content: 'this is c'});

app.partial('foo', {content: 'this is foo'});
app.partial('bar', {content: 'this is bar'});
app.partial('baz', {content: 'this is baz'});


// create an unnamed collection
var collection = app.collection();

collection.addView('a', 'this is a');
collection.addView('b', 'this is b');
collection.addView('c', 'this is c');
