'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Tmp = require('tmp');
Tmp.setGracefulCleanup();

var Process = require('child_process');
var Fs = require('fs');
var Dvb = require('ose-dvb');
var Dvblast = require('./index');
var Ucast = M.class('./ucast');
var Mcast = M.class('./mcast');

/** Docs {{{1
 * @module videolan
 * @type module
 */

/**
 * @class videolan.lib.dvblast
 */

// Public {{{1
exports.init = function() {  // {{{2
  this.on('pledge', pledge);
};

exports.homeInit = function(entry) {  // {{{2
  entry.on('remove', onRemove.bind(entry));

  entry.queueStateTimeout = 0;

  if (entry.data.mcast) {
    entry.find(entry.data.mcast, function(err, mcast) {
      if (err) {
        M.log.error(err);
      } else {
        entry.mcast = mcast;
      }
    });
  }
};

exports.spawn = function(entry, config, cb) {
  if (entry.ps) {
    var ps = entry.ps;
    delete entry.ps;
    ps.kill();
  }

  Tmp.file(function(err, path, fd) {
    if (err) {
      cb(err);
      return;
    }

    Fs.write(fd, config);
    Fs.close(fd, function(err) {
      if (err) {
        cb(err);
        return;
      }

      var args = [
        '--adapter', entry.data.adapter || 0,
        '--bandwidth', entry.dvbMplex.data.bandwidth,
        '--frequency', entry.dvbMplex.data.freq,
        '--modulation', entry.dvbMplex.data.modulation,
        '--config-file', path,
        '--epg-passthrough',
      ];

      entry.ps = Process.spawn('dvblast', args);
      entry.ps.on('exit', psExit.bind(entry, entry.ps));

  //    entry.ps.stderr.setEncoding('utf8');
  //    entry.ps.stderr.on('data', M.log.bind('notice', 'DVBLAST'));

      M.log.notice('DVBlast spawned', {pid: entry.ps.pid});

      cb();
      return;
    });
  });
};

// }}}1
// Private {{{1
function pledge(req, socket) {  // {{{2
/**
 * Registers media player
 *
 * @param req {Object} Request data
 * @param socket {Object} Slave socket
 *
 * @method pledge
 */

  var e = this.entry;

  Dvb.readPledge(e, req, socket, function(player, mcast, mplex, channel) {
    if (mcast && (mcast === e.mcast)) {  // Check mcast {{{3
      switch (e.dvbStream) {
      case undefined:  // Nothing is streaming right now
        new Mcast(e, req, player, mplex, channel, socket);
        return;
      case 'ucast':  // Streaming in ucast mode
        if (e.dvbClients.player === player) {
          Ose.link.close(e.dvbClients);
          new Mcast(e, req, player, mplex, channel, socket);
          return;
        }

        Ose.link.close(socket);
        return;
      case 'mcast':  // Streaming in mcast mode
        if (e.dvbMplex === mplex) {
          new Mcast(e, req, player, mplex, channel, socket);
          return;
        }

        Ose.link.close(socket);
        return;
      default:
        throw Ose.error(e, 'Invalid `dvbStream` value', e.dvbStream);
      }
    }

    switch (e.dvbStream) {  // Check ucast {{{3
    case undefined:
      new Ucast(e, req, player, mplex, channel, socket);
      return;
    case 'ucast':
      if (e.dvbClients.player === player) {
        Ose.link.close(e.dvbClients);
        new Ucast(e, req, player, mplex, channel, socket);
        return;
      }

      Ose.link.close(socket);
      return;
    case 'mcast':
      Ose.link.close(socket);
      return;
    }

    throw Ose.error(e, 'Invalid `dvbStream` value', e.dvbStream);

    // }}}3
  });
};

function psExit(ps, code, signal) {  // {{{2
  // `this` is bound to entry

  M.log.notice('DVBlast process exited', {pid: ps.pid, code: code, signal: signal});

  if (this.ps !== ps) {
    return;
  }

  delete this.ps;

  if (! this.dvbClients) {
    return;
  }

  var c = this.dvbClients;
  Dvblast.cleanDvb(this);

  var err = Ose.error(this, 'PROCESS_EXIT', 'DVBStream process exited', {pid: ps.pid, code: code, signal: signal});
  if (! Array.isArray(c)) {
    Ose.link.error(c, err);
    return;
  }


  for (var i = 0; i < c.length; i++) {
    Ose.link.error(c[i], err);
  }
  return;
}

function onRemove() {  // {{{2
  // `this` is bound to entry

  if (this.ps) {
    this.ps.kill();
  }
}

// }}}1
