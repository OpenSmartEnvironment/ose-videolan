'use strict';

var Ose = require('ose');
var M = Ose.class(module, C);

var Process = require('child_process');
var Fs = require('fs');

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
function C(entry, socket) {  // {{{2
/**
 * Socket constructor
 *
 * @method init
 * @constructor
 */

  this.entry = entry;
//  this.cid = ++entry.cid;
//  entry.dvbClients[this.cid] = this;

  Ose.link.open(this, socket);
};

exports.close = function(req) {  // {{{2
/**
 * Close handler
 *
 * @param [req] {Object}
 *
 * @method close
 */

  stop(this.entry);

//  delete this.entry.dvbClients[this.cid];
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

  this.close();
};

exports.stream = function(req) {  // {{{2
/**
 * `stream` [command handler]
 *
 * @param req {Object} Stream to be connected to
 *
 * @method stream
 */

  spawn(this.entry, req);
};

exports.stop = function(req) {  // {{{2
/**
 * `stream` [command handler]
 *
 * @param req {Object} Stream to be connected to
 *
 * @method stream
 */

  stop(this.entry);
};

// }}}1
// Private {{{1
function spawn(entry, params) {  // {{{2
  if (entry.ps) {
    entry.ps.kill();
    delete entry.ps;
  }

  Process.exec('killall dvblast', function() {  // {{{3
    Fs.writeFile('/tmp/dvblast.cfg', '10.166.25.8:5000 1 ' + params.number, onFile);
  });

  function onFile(err) {  // {{{3
    if (err) {
      M.log.unhandled('Error creating dvblast configuration file');
      return;
    }

    var args = [
      '--adapter', 0,
      '--bandwidth', params.bandwidth,
      '--frequency', params.freq,
      '--modulation', params.modulation,
      '--config-file', '/tmp/dvblast.cfg',
      '--epg-passthrough'
    ];

    entry.ps = Process.spawn('dvblast', args);
//    entry.ps.stderr.setEncoding('utf8');
//    entry.ps.stderr.on('data', M.log.bind('notice', 'DVBLAST'));

    console.log('DVBLAST SPAWNED');
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
