import EventUtil from 'util-events'
cc.Class({
  name: 'Draggable',
  extends: cc.Component,
  editor: CC_EDITOR && {
    help: 'https://code.vipkid.com.cn/lingobus-fe/games/library/comp-draggable/wikis/home'
  },
  properties: {
    tag: "",
    draggingZIndex: {
      default: 1000
    },
    draggingCursorStyle: {
      default: 'pointer'
    },
    onDragStartEvent: {
      type: cc.Component.EventHandler,
      default: []
    },
    onDragCancelEvent: {
      type: cc.Component.EventHandler,
      default: []
    },
    passTestByDefault: {
      default: false
    },
    test: {
      type: cc.Component.EventHandler,
      default: null
    },
    onRestoreEvent: {
      type: cc.Component.EventHandler,
      default: null
    },
    testPassAudio: {
      url: cc.AudioClip,
      default: null
    },
    testFailedAudio: {
      url: cc.AudioClip,
      default: null
    }
  },
  onLoad () {
    this._exit = true;
    this._other = null;
  },
  start () {
    const n = this.node, canStyl = (cc.game.canvas || cc._canvas).style, ET = cc.Node.EventType;

    // save initial node position for restore
    const ix = n.x, iy = n.y, izIndex = n.zIndex, iparent = n.parent;
    const doRestore = _ => {
      n.x = ix;
      n.y = iy;
      n.zIndex = izIndex;
      n.parent = iparent;
    }
    const restore = () => {
      var result = null;
      if(this.onRestoreEvent) {
        result = EventUtil.callHandler(this.onRestoreEvent, [this.node, this]);
      }
      if (!result) {
        doRestore();
      } else if (typeof result === 'function') {
        result(doRestore, ix, iy, izIndex, this.node, this);
      } else if (result.then) {
        result.then(doRestore)
      }
    };

    // change cursor style on pc
    if (this.draggingCursorStyle) {
      n.on(ET.MOUSE_ENTER, e => canStyl.cursor = this.draggingCursorStyle);
      n.on(ET.MOUSE_LEAVE, e => canStyl.cursor = 'default');
    }

    n.on(ET.TOUCH_START, e => {
      n.zIndex = this.draggingZIndex;
      EventUtil.emitEvents(this.onDragStartEvent);
    });

    n.on(ET.TOUCH_MOVE, e => {
      const delta = e.touch.getDelta();
      n.x += delta.x;
      n.y += delta.y;
    });

    n.on(ET.TOUCH_END, e => {
      var props = this.passTestByDefault;
      if (this.test) {
        props = EventUtil.callHandler(this.test, [e, this.node, this._other]);
      }
      if (isPlainObject(props)) {
        if (props) Object.assign(n, props);
        if (this.testPassAudio) cc.audioEngine.play(this.testPassAudio);
      } else {
        // here we schedule restore to make sure it will be called after Droppable's onDrop handler
        if (props !== false) this.scheduleOnce(restore);
        if (this.testFailedAudio) cc.audioEngine.play(this.testFailedAudio);
      }
    });

    n.on(ET.TOUCH_CANCEL, e => {
      EventUtil.emitEvents(this.onDragStartEvent);
      restore(e);
      e.stopPropagation();
    });
  },
  onCollisionEnter: function (other) {
    this._other = other.node;
    this._exit = false;
  },
  onCollisionExit: function () {
    this._other = null;
    this._exit = true;
  },
  _dispose (e) {
    e.targetOff(cc.Node.EventType.TOUCH_START);
    e.targetOff(cc.Node.EventType.TOUCH_MOVE);
    e.targetOff(cc.Node.EventType.TOUCH_END);
    e.targetOff(cc.Node.EventType.TOUCH_CANCEL);
  }
});

var isPlainObject = function (obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
};
