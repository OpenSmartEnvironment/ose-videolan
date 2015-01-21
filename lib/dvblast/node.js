'use strict';

var Ose = require('ose');
var M = Ose.module(module);

var Tmp = require('tmp');
var Dvb = require('ose-dvb');
var Ucast = M.class('./ucast');
var Mcast = M.class('./mcast');

/** Docs {{{1
 * @module videolan
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
  this.kill(entry, function(err) {  // {{{3
    if (err) {
      M.log.error(err);
    }

    Tmp.file(onFile);
  });

  function onFile(err, path, fd) {  // {{{3
    if (err) {
      cb(err);
      return;
    }

    Fs.write(fd, config.join('\n'));
    Fs.close(fd, function(err) {
      if (err) {
        cb(err);
        return;
      }

      entry.ps = Process.spawn('dvblast', [
        '--adapter', e.data.adapter || 0,
        '--bandwidth', e.dvbMplex.bandwidth,
        '--frequency', e.dvbMplex.freq,
        '--modulation', e.dvbMplex.modulation,
        '--config-file', path,
        '--epg-passthrough',
      ]);

  //    entry.ps.stderr.setEncoding('utf8');
  //    entry.ps.stderr.on('data', M.log.bind('notice', 'DVBLAST'));

      M.log.notice('DVBlast spawned', entry.ps.pid);

      cb();
      return;
    });
  }

  // }}}3
};

exports.kill = function(entry, cb) {  // {{{2
  if (! entry.ps) {
    cb && cb();
    return;
  }

  var ps = entry.ps;
  delete entry.ps;

  entry.ps.kill(function(err) {
    if (err) {
      if (cb) {
        cb(err);
        return;
      }

      M.log.error(err);
      return;
    }

    M.log.notice('DVBlast killed', ps.pid);
    cb && cb();
    return;
  });
  return;
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
          new Mcast(e, req, player, mcast, mplex, channel, socket);
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

function onRemove() {  // {{{2
  // `this` is bound to entry

  exports.kill(this);
}

// }}}1
