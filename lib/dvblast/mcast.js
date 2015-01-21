'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Process = require('child_process');
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
 * @class videolan.lib.dvblast.master
 * @type class
 */

// Public {{{1
function C(entry, req, player, mplex, channel, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @method constructor
 */

  console.log('DVBLAST MULTICAST REQ', req);

  switch (entry.dvbStream) {
  case undefined:
    if (entry.dvbClients || entry.dvbMplex) {
      throw Ose.error(entry, 'Duplicit streamer', {clients: Ose.identify(entry.dvbClients), mplex: Ose.identify(entry.mplex)});
    }

    entry.dvbStream === 'mcast';
    entry.dvbClients = [this];
    entry.dvbMplex = mplex;
    break;
  case 'mcast':
    entry.dvbClients.push(this);
    break;
  default:
    throw Ose.error(entry, 'Invalid `dvbStream`', entry.dvbStream);
  }

  this.url = req.ucast;

  this.entry = entry;
  this.player = player;
  this.channel = channel;

  var score = 2;
  if (entry.ps) {
    score = 0;
  } else if (entry.dvbClients.length > 1) {
    score = 1;
  }

  Ose.link.open(this, socket, {score: score});
};

exports.close = function(req) {  // {{{2
/**
 * Close handler
 *
 * @param [req] {Object}
 *
 * @method close
 */

  var e = this.entry;
  delete this.entry;

  e.dvbClients = Ose._.without(e.dvbClients, this);
  if (e.dvbClients.length === 0) {
    delete e.dvbClients;
    delete e.dvbStream;
    delete e.dvbMplex;
    delete e.dvbChannels;
    delete e.dvbConfig;
    Dvblast.kill(e);
  }
};

exports.error = function(err) {  // {{{2
/**
 * Error handler
 *
 * @param err {Object} [Error] instance
 *
 * @method error
 */

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

  console.log('DVBLAST STREAM', req);

  if (e.ps) {
    Ose.link.close(socket, e.dvbChannels[this.channel.data.number].address);
    return;
  }

  Dvblast.mplex2Config(e, function(err, text) {
    if (err) {
      Ose.link.error(socket, err);
      return;
    }

    Dvblast.spawn(e, text, function(err) {
      if (err) {
        Ose.link.error(socket, err);
        return;
      }

      Ose.link.close(socket, e.dvbChannels[this.channel.data.number].address);
      return;
    });
    return;
  });
  return;
};

// }}}1
