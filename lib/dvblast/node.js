'use strict';

const O = require('ose')(module);

var Tmp = require('tmp');
Tmp.setGracefulCleanup();

var Process = require('child_process');
var Fs = require('fs');

/** Docs {{{1
 * @module videolan
 * @type module
 */

/**
 * @class videolan.lib.dvblast
 */

// Public {{{1
exports.kill = function(entry) {
/**
 * Kill dvblast process
 *
 * @param entry {Object} Entry
 *
 * @method kill
 */

  if (entry.ps) {
    entry.ps.kill();
    delete entry.ps;
  }
};

exports.spawn = function(entry, cb) {  // {{{2
/**
 * Spawn dvblast process
 *
 * @param entry {Object} Entry
 * @param cb {Function} Callback
 *
 * @method spawn
 */

  if (! entry.current) {
    cb(O.error(entry, 'Configuration is not specified'));
    return;
  }

  if (! entry.ps) {
    return doit();
  } else {
    var ps = entry.ps;
    delete entry.ps;
    ps.removeAllListeners();
    ps.on('error', doit);
    ps.on('exit', doit);
    ps.kill();
  }

  function doit() {
    if (! entry) return;

    var e = entry;
    entry = undefined;
    Tmp.file(function(err, path, fd) {
      if (err) {
        cb(err);
        return;
      }

      Fs.write(fd, e.current.config);
      Fs.close(fd, function(err) {
        if (err) {
          cb(err);
          return;
        }

        var args = [
          '--adapter', e.dval.adapter || 0,
          '--bandwidth', e.current.mplex.dval.bandwidth,
          '--frequency', e.current.mplex.dval.freq,
          '--modulation', e.current.mplex.dval.modulation,
          '--config-file', path,
          '--epg-passthrough',
        ];

        e.ps = Process.spawn('dvblast', args);
        e.ps.on('exit', onExit.bind(e, e.ps));
        e.ps.on('error', onError.bind(e, e.ps));

    //    e.ps.stderr.setEncoding('utf8');
    //    e.ps.stderr.on('data', O.log.bind('notice', 'DVBLAST'));

        O.log.notice('DVBlast spawned', {pid: e.ps.pid});

        cb();
        return;
      });
    });
  }
};

// }}}1
// Entry event handlers {{{1
function onError(ps, err) {  // {{{2
  O.log.error(err);

  onExit.call(this, ps);
}

function onExit(ps, code, signal) {  // {{{2
  O.log.notice('DVBlast process exited', {pid: ps.pid, code: code, signal: signal});

  if (ps !== this.ps) {
    return;
  }

  delete this.ps;

  // TODO notify this.current.boons and reopen if necessary

  return;
}

// }}}1
