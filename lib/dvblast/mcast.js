'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Process = require('child_process');

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
function C(entry, req, player, mcast, mplex, channel, socket) {  // {{{2
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
  this.mcast = mcast;
  this.player = player;
  this.channel = channel;

  if (entry.mcast) {
    Ose.link.open(that, socket, {
      score: 0,
      mcast: entry.mcast,
    });
    return;
  }

  Ose.link.open(that, socket, {score: 1});
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
  stop(e);

  e.dvbClients = Ose._.without(e.dvbClients, this);
  if (e.dvbClients.length === 0) {
    delete e.dvbClients;
    delete e.dvbStream;
  }

  delete this.entry;
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

  spawn(this.entry, this.channel.data.number, this.url, this.mplex.data, function(err) {
    if (err) {
      Ose.link.error(socket, err);
    } else {
      Ose.link.close(socket, {url: e.data.ucast});
    }
  });
};

// }}}1
// Private {{{1
function spawn(entry, channel, address, mplex, cb) {  // {{{2
  console.log('UCAST SPAWN', entry.identify(), channel, address, typeof cb);

  if (entry.ps) {
    entry.ps.kill(onKill);
    delete entry.ps;
  } else {
    onKill();
  }

  function onKill() {  // {{{3
    Process.exec('killall dvblast', onKillall);
  }

  function onKillall() {  // {{{3
    Fs.writeFile('/tmp/dvblast.cfg', address + ' 1 ' + channel, onFile);
  }

  function onFile(err) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    var args = [
      '--adapter', 0,
      '--bandwidth', mplex.bandwidth,
      '--frequency', mplex.freq,
      '--modulation', mplex.modulation,
      '--config-file', '/tmp/dvblast.cfg',
      '--epg-passthrough'
    ];

    entry.ps = Process.spawn('dvblast', args);
//    entry.ps.stderr.setEncoding('utf8');
//    entry.ps.stderr.on('data', M.log.bind('notice', 'DVBLAST'));

    console.log('DVBLAST SPAWNED');

    cb();
    return;
  };

  // }}}3
};

function stop(entry) {  // {{{2
  if (entry.ps) {
    entry.ps.kill();
    delete entry.ps;
  }

  console.log('DVBLAST STOPPED');
};

// }}}1


/*
*/
