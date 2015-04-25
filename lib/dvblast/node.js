'use strict';

var O = require('ose').module(module);

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

  if (entry.ps) {
    var ps = entry.ps;
    delete entry.ps;
    ps.kill();
  }

  if (! entry.current) {
    cb(O.error(entry, 'Configuration is not specified'));
    return;
  }

  Tmp.file(function(err, path, fd) {
    if (err) {
      cb(err);
      return;
    }

    Fs.write(fd, entry.current.config);
    Fs.close(fd, function(err) {
      if (err) {
        cb(err);
        return;
      }

      var args = [
        '--adapter', entry.data.adapter || 0,
        '--bandwidth', entry.current.mplex.data.bandwidth,
        '--frequency', entry.current.mplex.data.freq,
        '--modulation', entry.current.mplex.data.modulation,
        '--config-file', path,
        '--epg-passthrough',
      ];

      entry.ps = Process.spawn('dvblast', args);
      entry.ps.on('exit', onExit.bind(entry, entry.ps));
      entry.ps.on('error', onError.bind(entry, entry.ps));

  //    entry.ps.stderr.setEncoding('utf8');
  //    entry.ps.stderr.on('data', O.log.bind('notice', 'DVBLAST'));

      O.log.notice('DVBlast spawned', {pid: entry.ps.pid});

      cb();
      return;
    });
  });
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
