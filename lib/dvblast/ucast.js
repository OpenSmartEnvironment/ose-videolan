'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Dvblast = require('./index');

/** Doc {{{1
 * @module videolan
 */

/**
 * @caption DVBlast response socket
 * 
 * @readme
 * [Response socket] relaying the switch entry events to the client.
 *
 * TODO
 *
 * @class videolan.lib.dvblast.ucast
 * @type class
 */

// Public {{{1
function C(entry, req, player, mplex, channel, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @method constructor
 */

  if (entry.dvbStream || entry.dvbClients || entry.dvbMplex) {
    throw Ose.error(entry, 'Duplicit streamers');
  }

  entry.dvbStream = 'ucast';
  entry.dvbClients = this;
  entry.dvbMplex = mplex;

  this.entry = entry;
  this.player = player;
  this.channel = channel;

  Ose.link.open(this, socket, {score: 2});
};

exports.close = function(req) {  // {{{2
  var e = this.entry;
  delete this.entry;

  Dvblast.cleanDvb(e, true);

  return;
};

exports.split = function(err) {  // {{{2
  this.close();
};

exports.error = function(err) {  // {{{2
  M.log.error(err);

  this.close();
};

exports.stream = function(req, socket) {  // {{{2
/**
 * `stream` [command handler]
 *
 * @param req {Object} Stream to be connected to
 *
 * @method stream
 */

  var e = this.entry;

  Dvblast.spawn(e, [req.url + ' 1 ' + this.channel.data.number], function(err) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      Ose.link.close(socket, req.url);
    }
  });
};

// }}}1
