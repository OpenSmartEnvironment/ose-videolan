'use strict';

const O = require('ose')(module)
  .singleton('ose/lib/kind')
  .prepend('node')
;

exports = O.init('control', 'vlc');

exports.role = ['playback'];

/** Docs {{{1
 * @module videolan
 */

/**
 * @caption VLC kind
 *
 * @readme
 * [Entry kind] allowing to control VLC
 *
 * See [Media player example]
 *
 * @kind vlc
 * @schema control
 * @aliases vlc
 * @class videolan.lib.vlc
 * @main videolan.lib.vlc
 * @extend ose.lib.kind
 * @type singleton
 */

/*
sval: {
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
  fullscreen: <boolean>
}
 */
