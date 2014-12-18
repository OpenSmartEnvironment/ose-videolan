'use strict';

var Ose = require('ose');
var M = Ose.singleton(module, 'ose/lib/kind');
exports = M.exports;

exports.homeInit = './home';

/** Docs {{{1
 * @module videolan
 */

/**
 * @caption VLC kind
 *
 * @readme
 * [Entry kind] allowing to control VLC
 *
 * @class videolan.lib.vlc
 * @main videolan.lib.vlc
 * @extend ose.lib.kind
 * @type singleton
 */

/*
state: {
  status: <string>  // 'stopped', 'playing', 'paused'
  pos: {
    at: <timestamp>  // When position value was acquired.
    value: <integer>
    length: <integer>
  }
  info: {  //  media info
    artist: <string>
    album: <string>
    url: <string>
    title: <string>
    comment: <string>
  }
  can: {
    goPrevious: <boolean>
    goNext: <boolean>
    setFullscreen: <boolean>
    pause: <boolean>
  }
  shuffle: <boolean>
  fullscreen: // TODO
}
 */
