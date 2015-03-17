'use strict';

var O = require('ose').class(module, C);

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
 * @class videolan.lib.dvblast.mcast
 * @type class
 */

// Public {{{1
function C(entry, req, player, mplex, channel, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @method constructor
 */

  switch (entry.dvbStream) {
  case undefined:
    if (entry.dvbClients || entry.dvbMplex) {
      throw O.error(entry, 'Duplicit streamer', {clients: O.identify(entry.dvbClients), mplex: O.identify(entry.mplex)});
    }

    entry.dvbStream = 'mcast';
    entry.dvbClients = [this];
    entry.dvbMplex = mplex;
    break;
  case 'mcast':
    entry.dvbClients.push(this);
    break;
  default:
    throw O.error(entry, 'Invalid `dvbStream`', entry.dvbStream);
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

  O.link.open(this, socket, {score: score});
};

exports.close = function(req) {  // {{{2
  var e = this.entry;
  delete this.entry;

  e.dvbClients = O._.without(e.dvbClients, this);
  if (e.dvbClients.length === 0) {
    Dvblast.cleanDvb(e, true);

    if (e.ps) {
      ps = e.ps
      e.ps.kill();
    }
  }
};

exports.split = function(err) {  // {{{2
  this.close();
};

exports.error = function(err) {  // {{{2
  O.log.error(err);

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
  var c = this.channel.data.number;

  if (e.ps) {
    O.link.close(socket, e.dvbChannels[c].address + ':5004');
    return;
  }

  Dvblast.mplex2Config(e, function(err, text) {
    if (err) {
      O.link.error(socket, err);
      return;
    }

    Dvblast.spawn(e, text, function(err) {
      if (err) {
        O.link.error(socket, err);
        return;
      }

      O.link.close(socket, e.dvbChannels[c].address + ':5004');
      return;
    });
    return;
  });
  return;
};

// }}}1
