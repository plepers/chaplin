/*!
 * Chaplin 0.8.1
 *
 * Chaplin may be freely distributed under the MIT license.
 * For all details and documentation:
 * http://chaplinjs.org
 */

require.define({'chaplin/application': function(exports, require, module) {
'use strict';
var Application, Backbone, Composer, Dispatcher, EventBroker, Layout, Router, mediator, _;

_ = require('underscore');

Backbone = require('backbone');

mediator = require('chaplin/mediator');

Dispatcher = require('chaplin/dispatcher');

Layout = require('chaplin/views/layout');

Composer = require('chaplin/composer');

Router = require('chaplin/lib/router');

EventBroker = require('chaplin/lib/event_broker');

module.exports = Application = (function() {
  function Application() {}

  Application.extend = Backbone.Model.extend;

  _(Application.prototype).extend(EventBroker);

  Application.prototype.title = '';

  Application.prototype.dispatcher = null;

  Application.prototype.layout = null;

  Application.prototype.router = null;

  Application.prototype.composer = null;

  Application.prototype.initialize = function() {};

  Application.prototype.initDispatcher = function(options) {
    return this.dispatcher = new Dispatcher(options);
  };

  Application.prototype.initLayout = function(options) {
    var _ref;

    if (options == null) {
      options = {};
    }
    if ((_ref = options.title) == null) {
      options.title = this.title;
    }
    return this.layout = new Layout(options);
  };

  Application.prototype.initComposer = function(options) {
    if (options == null) {
      options = {};
    }
    return this.composer = new Composer(options);
  };

  Application.prototype.initRouter = function(routes, options) {
    this.router = new Router(options);
    return typeof routes === "function" ? routes(this.router.match) : void 0;
  };

  Application.prototype.startRouting = function() {
    return this.router.startHistory();
  };

  Application.prototype.disposed = false;

  Application.prototype.dispose = function() {
    var prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    properties = ['dispatcher', 'layout', 'router', 'composer'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      if (!(this[prop] != null)) {
        continue;
      }
      this[prop].dispose();
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Application;

})();

}});;require.define({'chaplin/mediator': function(exports, require, module) {
'use strict';
var Backbone, mediator, support, utils;

Backbone = require('backbone');

support = require('chaplin/lib/support');

utils = require('chaplin/lib/utils');

mediator = {};

mediator.subscribe = Backbone.Events.on;

mediator.unsubscribe = Backbone.Events.off;

mediator.publish = Backbone.Events.trigger;

mediator._callbacks = null;

utils.readonly(mediator, 'subscribe', 'unsubscribe', 'publish');

mediator.seal = function() {
  if (support.propertyDescriptors && Object.seal) {
    return Object.seal(mediator);
  }
};

utils.readonly(mediator, 'seal');

module.exports = mediator;

}});;require.define({'chaplin/dispatcher': function(exports, require, module) {
'use strict';
var Backbone, ComponentsLoader, CompositeController, Dispatcher, DomModel, EventBroker, utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __slice = [].slice;

_ = require('underscore');

Backbone = require('backbone');

utils = require('chaplin/lib/utils');

EventBroker = require('chaplin/lib/event_broker');

CompositeController = require('chaplin/controllers/composite');

DomModel = require('chaplin/models/dom_model');

ComponentsLoader = (function() {
  ComponentsLoader.extend = Backbone.Model.extend;

  _(ComponentsLoader.prototype).extend(Backbone.Events);

  ComponentsLoader.prototype.disposed = false;

  ComponentsLoader.prototype.contexts = null;

  ComponentsLoader.prototype.settings = null;

  function ComponentsLoader(settings) {
    this.settings = settings;
    this.complete = __bind(this.complete, this);
  }

  ComponentsLoader.prototype.dispose = function() {
    this.contexts = null;
    this.disposed = true;
    this.settings = null;
    return this.off(null, null, null);
  };

  ComponentsLoader.prototype.load = function(contexts) {
    var names,
      _this = this;

    this.contexts = contexts;
    names = _.map(contexts, function(ctx) {
      return _this.settings.controllerPath + ctx.name + _this.settings.controllerSuffix;
    });
    if (typeof define !== "undefined" && define !== null ? define.amd : void 0) {
      return require(names, this.complete);
    } else {
      throw new Error('Dispatch#loadControllers need AMD');
    }
  };

  ComponentsLoader.prototype.complete = function() {
    var components;

    components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (this.disposed) {
      return;
    }
    return this.trigger("complete", this.contexts, components);
  };

  ComponentsLoader.prototype.mapper = function(ctx) {
    return this.settings.controllerPath + ctx.name + this.settings.controllerSuffix;
  };

  return ComponentsLoader;

})();

module.exports = Dispatcher = (function() {
  Dispatcher.extend = Backbone.Model.extend;

  _(Dispatcher.prototype).extend(EventBroker);

  Dispatcher.prototype.previousRoute = null;

  Dispatcher.prototype.currentController = null;

  Dispatcher.prototype.currentRoute = null;

  Dispatcher.prototype.currentParams = null;

  Dispatcher.prototype.composite = null;

  Dispatcher.prototype.structure = null;

  Dispatcher.prototype.domModel = null;

  Dispatcher.prototype.loader = null;

  function Dispatcher() {
    this.skeletonParsing = __bind(this.skeletonParsing, this);
    this.updateSkeleton = __bind(this.updateSkeleton, this);    this.initialize.apply(this, arguments);
  }

  Dispatcher.prototype.initialize = function(options) {
    var dmc;

    if (options == null) {
      options = {};
    }
    this.settings = _(options).defaults({
      controllerPath: 'controllers/',
      controllerSuffix: '_controller'
    });
    this.subscribeEvent('router:fallback', this.fallback);
    if (options['domModelContainer']) {
      dmc = options['domModelContainer'];
    } else {
      dmc = document.createElement('div');
      dmc.id = "_skeleton";
      document.body.appendChild(dmc);
    }
    this.domModel = new DomModel(dmc);
    this.domModel.on("update", this.updateSkeleton);
    this.domModel.on("parsing", this.skeletonParsing);
    return this.updateSkeleton();
  };

  Dispatcher.prototype.updateSkeleton = function() {
    var contexts;

    console.log('Dispatcher#updateSkeleton');
    contexts = this.domModel.getFlatten();
    return this.loadControllers(contexts);
  };

  Dispatcher.prototype.skeletonParsing = function() {
    if (this.loader != null) {
      this.loader.dispose();
    }
    return this.loader = null;
  };

  Dispatcher.prototype.controllersLoaded = function(contexts, controlers) {
    var ctx, i, _i, _len;

    for (i = _i = 0, _len = contexts.length; _i < _len; i = ++_i) {
      ctx = contexts[i];
      ctx.initialize(controlers[i]);
    }
    return this.domModel.compose();
  };

  Dispatcher.prototype.fallback = function(fragment) {
    var url;

    console.log("Dispatcher#fallback : " + fragment);
    url = fragment + ".html";
    if (url[0] !== "/") {
      url = '/' + url;
    }
    return this.domModel.fetch({
      url: url
    });
  };

  Dispatcher.prototype.loadControllers = function(contexts, handler) {
    if (this.loader != null) {
      this.loader.dispose();
    }
    this.loader = new ComponentsLoader(this.settings);
    this.loader.on('complete', this.controllersLoaded, this);
    return this.loader.load(contexts);
  };

  Dispatcher.prototype.adjustURL = function(route, params, options) {
    var url;

    if (route.path == null) {
      return;
    }
    url = route.path + (route.query ? "?" + route.query : "");
    if (options.changeURL) {
      return this.publishEvent('!router:changeURL', url, options);
    }
  };

  Dispatcher.prototype.disposed = false;

  Dispatcher.prototype.dispose = function() {
    if (this.disposed) {
      return;
    }
    this.unsubscribeAllEvents();
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Dispatcher;

})();

}});;require.define({'chaplin/composer': function(exports, require, module) {
'use strict';
var Backbone, Composer, Composition, EventBroker, utils, _;

_ = require('underscore');

Backbone = require('backbone');

utils = require('chaplin/lib/utils');

Composition = require('chaplin/lib/composition');

EventBroker = require('chaplin/lib/event_broker');

module.exports = Composer = (function() {
  Composer.extend = Backbone.Model.extend;

  _(Composer.prototype).extend(EventBroker);

  Composer.prototype.compositions = null;

  function Composer() {
    this.initialize.apply(this, arguments);
  }

  Composer.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.compositions = {};
    this.subscribeEvent('!composer:compose', this.compose);
    this.subscribeEvent('!composer:retrieve', this.retrieve);
    this.subscribeEvent('dispatcher:dispatch', this.cleanup);
    return this.subscribeEvent('composite:composed', this.cleanup);
  };

  Composer.prototype.compose = function(name, second, third) {
    if (typeof second === 'function') {
      if (third || second.prototype.dispose) {
        if (second.prototype instanceof Composition) {
          return this._compose(name, {
            composition: second,
            options: third
          });
        } else {
          return this._compose(name, {
            options: third,
            compose: function() {
              var autoRender, disabledAutoRender;

              this.item = new second(this.options);
              autoRender = this.item.autoRender;
              disabledAutoRender = autoRender === void 0 || !autoRender;
              if (disabledAutoRender && typeof this.item.render === 'function') {
                return this.item.render();
              }
            }
          });
        }
      }
      return this._compose(name, {
        compose: second
      });
    }
    if (typeof third === 'function') {
      return this._compose(name, {
        compose: third,
        options: second
      });
    }
    return this._compose(name, second);
  };

  Composer.prototype._compose = function(name, options) {
    var composition, current;

    if (typeof options.compose !== 'function' && (options.composition == null)) {
      throw new Error('Composer#compose was used incorrectly');
    }
    if (options.composition != null) {
      composition = new options.composition(options.options);
    } else {
      composition = new Composition(options.options);
      composition.compose = options.compose;
      if (options.check) {
        composition.check = options.check;
      }
    }
    current = this.compositions[name];
    if (current && current.check(composition.options)) {
      current.stale(false);
    } else {
      if (current) {
        current.dispose();
      }
      composition.compose(composition.options);
      composition.stale(false);
      this.compositions[name] = composition;
    }
    return this.compositions[name];
  };

  Composer.prototype.retrieve = function(name, callback) {
    var active, item;

    active = this.compositions[name];
    item = (active && !active.stale() ? active.item : void 0);
    return callback(item);
  };

  Composer.prototype.cleanup = function() {
    var composition, name, _ref;

    _ref = this.compositions;
    for (name in _ref) {
      composition = _ref[name];
      if (composition.stale()) {
        composition.dispose();
        delete this.compositions[name];
      } else {
        composition.stale(true);
      }
    }
  };

  Composer.prototype.dispose = function() {
    var composition, name, _ref;

    if (this.disposed) {
      return;
    }
    this.unsubscribeAllEvents();
    _ref = this.compositions;
    for (name in _ref) {
      composition = _ref[name];
      composition.dispose();
    }
    delete this.compositions;
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Composer;

})();

}});;require.define({'chaplin/controllers/controller': function(exports, require, module) {
'use strict';
var Backbone, Controller, EventBroker, _,
  __hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

module.exports = Controller = (function() {
  Controller.extend = Backbone.Model.extend;

  _(Controller.prototype).extend(Backbone.Events);

  _(Controller.prototype).extend(EventBroker);

  Controller.prototype.view = null;

  Controller.prototype.context = null;

  Controller.prototype.redirected = false;

  function Controller() {}

  Controller.prototype.initialize = function(context) {
    return this.context = context;
  };

  Controller.prototype.createRegions = function(len) {
    return null;
  };

  Controller.prototype.attach = function(el) {
    if (this.view != null) {
      return this.view.attach(el);
    }
  };

  Controller.prototype.compose = function(name, second, third) {
    var item;

    if (arguments.length === 1) {
      item = null;
      this.publishEvent('!composer:retrieve', name, function(composition) {
        return item = composition;
      });
      return item;
    } else {
      return this.publishEvent('!composer:compose', name, second, third);
    }
  };

  Controller.prototype.redirectTo = function(url, options) {
    if (options == null) {
      options = {};
    }
    this.redirected = true;
    return this.publishEvent('!router:route', url, options, function(routed) {
      if (!routed) {
        throw new Error('Controller#redirectTo: no route matched');
      }
    });
  };

  Controller.prototype.redirectToRoute = function(name, params, options) {
    this.redirected = true;
    return this.publishEvent('!router:routeByName', name, params, options, function(routed) {
      if (!routed) {
        throw new Error('Controller#redirectToRoute: no route matched');
      }
    });
  };

  Controller.prototype.disposed = false;

  Controller.prototype.dispose = function() {
    var obj, prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    for (prop in this) {
      if (!__hasProp.call(this, prop)) continue;
      obj = this[prop];
      if (!(obj && typeof obj.dispose === 'function')) {
        continue;
      }
      obj.dispose();
      delete this[prop];
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    properties = ['redirected'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Controller;

})();

}});;require.define({'chaplin/controllers/composite': function(exports, require, module) {
'use strict';
var Backbone, CompositeController, Controller, EventBroker, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

Controller = require('chaplin/controllers/controller');

({
  getRouteHash: function(route) {}
});

module.exports = CompositeController = (function(_super) {
  __extends(CompositeController, _super);

  function CompositeController() {
    this.chilren = [];
    this.hashmap = {};
    CompositeController.__super__.constructor.apply(this, arguments);
  }

  /*
      update composition with given routes
      and associated controllers classes
      check if ctrls routes are still valids
      create needed ones
      dipose invalids ctrls
  */


  CompositeController.prototype.recompose = function(controllers, routes) {
    var child, hash, i, index, newChilds, newMap, route, trash, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;

    trash = {};
    newChilds = [];
    newMap = {};
    for (i = _i = 0, _len = routes.length; _i < _len; i = ++_i) {
      route = routes[i];
      hash = route.controller + '#' + route.action;
      index = this.hashmap[hash];
      if ((index != null) && _.isEqual(this.chilren[index].route.params(route.params))) {
        newChilds.push(this.chilren[index]);
        this.chilren[index] = null;
      } else {
        newChilds.push({
          route: route,
          controller: new controllers[i](route.params, route, route.options),
          built: false
        });
      }
      newMap[hash] = i;
    }
    _ref = this.chilren;
    for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
      child = _ref[_j];
      if (child !== null) {
        this.dispose(child);
      }
    }
    this.chilren = newChilds;
    this.hashmap = newMap;
    _ref1 = this.chilren;
    for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
      child = _ref1[_k];
      if (!child.built) {
        if (child.controller.beforeAction) {
          this.executeBeforeActions(child.controller, child.route, child.route.params, child.route.options);
        } else {
          this.executeAction(child.controller, child.route, child.route.params, child.route.options);
        }
      }
    }
    return this.publishEvent('composite:composed', this.chilren);
  };

  CompositeController.prototype.executeAction = function(controller, route, params, options) {
    controller[route.action](params, route, options);
    if (controller.redirected) {

    }
  };

  CompositeController.prototype.executeBeforeActions = function(controller, route, params, options) {
    var action, actions, beforeActions, name, next, _i, _len, _ref,
      _this = this;

    beforeActions = [];
    _ref = utils.getAllPropertyVersions(controller, 'beforeAction');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      actions = _ref[_i];
      for (name in actions) {
        action = actions[name];
        if (name === route.action || RegExp("^" + name + "$").test(route.action)) {
          if (typeof action === 'string') {
            action = controller[action];
          }
          if (typeof action !== 'function') {
            throw new Error('Controller#executeBeforeActions: ' + ("" + action + " is not a valid action method for " + name + "."));
          }
          beforeActions.push(action);
        }
      }
    }
    next = function(method, previous) {
      if (previous == null) {
        previous = null;
      }
      if (controller.redirected) {
        return;
      }
      if (!method) {
        _this.executeAction(controller, route, params, options);
        return;
      }
      previous = method.call(controller, params, route, options, previous);
      if (previous && typeof previous.then === 'function') {
        return previous.then(function(data) {
          if (!_this.currentController || controller === _this.currentController) {
            return next(beforeActions.shift(), data);
          }
        });
      } else {
        return next(beforeActions.shift(), previous);
      }
    };
    return next(beforeActions.shift());
  };

  CompositeController.prototype.disposeChild = function(child) {
    child.controller.dispose(child.route.params, child.route, child.route.options);
    return this.publishEvent('beforeControllerDispose', child.controller);
  };

  return CompositeController;

})(Controller);

}});;require.define({'chaplin/controllers/root': function(exports, require, module) {
'use strict';
var Controller, Root, RootView, View, _ref, _ref1,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Controller = require('./controller');

View = require('chaplin/views/view');

RootView = (function(_super) {
  __extends(RootView, _super);

  function RootView() {
    _ref = RootView.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  RootView.prototype.render = function() {};

  return RootView;

})(View);

module.exports = Root = (function(_super) {
  __extends(Root, _super);

  function Root() {
    _ref1 = Root.__super__.constructor.apply(this, arguments);
    return _ref1;
  }

  Root.prototype.run = function() {
    return this.view = new RootView;
  };

  Root.prototype.createRegions = function(len) {
    var i, res, _i;

    res = [];
    for (i = _i = 0; 0 <= len ? _i <= len : _i >= len; i = 0 <= len ? ++_i : --_i) {
      res[i] = document.body;
    }
    return res;
  };

  return Root;

})(Controller);

}});;require.define({'chaplin/models/collection': function(exports, require, module) {
'use strict';
var Backbone, Collection, EventBroker, Model, utils, _, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

Model = require('chaplin/models/model');

utils = require('chaplin/lib/utils');

module.exports = Collection = (function(_super) {
  __extends(Collection, _super);

  function Collection() {
    _ref = Collection.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  _(Collection.prototype).extend(EventBroker);

  Collection.prototype.model = Model;

  Collection.prototype.initDeferred = function() {
    return _(this).extend($.Deferred());
  };

  Collection.prototype.serialize = function() {
    return this.map(utils.serialize);
  };

  Collection.prototype.disposed = false;

  Collection.prototype.dispose = function() {
    var prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    this.trigger('dispose', this);
    this.reset([], {
      silent: true
    });
    this.unsubscribeAllEvents();
    this.stopListening();
    this.off();
    if (typeof this.reject === "function") {
      this.reject();
    }
    properties = ['model', 'models', '_byId', '_byCid', '_callbacks'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Collection;

})(Backbone.Collection);

}});;require.define({'chaplin/models/model': function(exports, require, module) {
'use strict';
var Backbone, EventBroker, Model, serializeAttributes, serializeModelAttributes, utils, _, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

utils = require('chaplin/lib/utils');

EventBroker = require('chaplin/lib/event_broker');

serializeAttributes = function(model, attributes, modelStack) {
  var delegator, key, otherModel, serializedModels, value, _i, _len, _ref;

  delegator = utils.beget(attributes);
  if (modelStack == null) {
    modelStack = {};
  }
  modelStack[model.cid] = true;
  for (key in attributes) {
    value = attributes[key];
    if (value instanceof Backbone.Model) {
      delegator[key] = serializeModelAttributes(value, model, modelStack);
    } else if (value instanceof Backbone.Collection) {
      serializedModels = [];
      _ref = value.models;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        otherModel = _ref[_i];
        serializedModels.push(serializeModelAttributes(otherModel, model, modelStack));
      }
      delegator[key] = serializedModels;
    }
  }
  delete modelStack[model.cid];
  return delegator;
};

serializeModelAttributes = function(model, currentModel, modelStack) {
  var attributes;

  if (model === currentModel || _(modelStack).has(model.cid)) {
    return null;
  }
  attributes = typeof model.getAttributes === 'function' ? model.getAttributes() : model.attributes;
  return serializeAttributes(model, attributes, modelStack);
};

module.exports = Model = (function(_super) {
  __extends(Model, _super);

  function Model() {
    _ref = Model.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  _(Model.prototype).extend(EventBroker);

  Model.prototype.toString = function() {
    return this;
  };

  Model.prototype.initDeferred = function() {
    return _(this).extend($.Deferred());
  };

  Model.prototype.getAttributes = function() {
    return this.attributes;
  };

  Model.prototype.serialize = function() {
    return serializeAttributes(this, this.getAttributes());
  };

  Model.prototype.disposed = false;

  Model.prototype.dispose = function() {
    var prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    this.trigger('dispose', this);
    this.unsubscribeAllEvents();
    this.stopListening();
    this.off();
    if (typeof this.reject === "function") {
      this.reject();
    }
    properties = ['collection', 'attributes', 'changed', '_escapedAttributes', '_previousAttributes', '_silent', '_pending', '_callbacks'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Model;

})(Backbone.Model);

}});;require.define({'chaplin/models/html_model_parser': function(exports, require, module) {
var Backbone, Collection, DATA_ID_ATTR, DATA_LIST_ATTR, DATA_SELECTOR_ATTR, HtmlModelParser, LinkModel, Model, ModelContext, NodeModel, hasTemplate, mdl_set_options, modelFactory, modelsTemplates, tagNameSelector, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

Model = require('chaplin/models/model');

Collection = require('chaplin/models/collection');

DATA_ID_ATTR = "data-id";

DATA_LIST_ATTR = "data-list";

DATA_SELECTOR_ATTR = "data-sel";

mdl_set_options = {
  silent: true
};

modelsTemplates = {};

hasTemplate = function(ctx) {
  return modelsTemplates[ctx.node.tagName] != null;
};

modelFactory = function(node, attributes) {
  var ModelClass;

  if (node == null) {
    return new Model(attributes);
  }
  ModelClass = modelsTemplates[node.tagName];
  if (ModelClass != null) {
    return new ModelClass(node, attributes);
  }
  return new Model(attributes);
};

ModelContext = (function() {
  function ModelContext(id, isCollection) {
    this.id = id;
    this.attributes = {};
    this.children = [];
    this.data = null;
    this.selector = [];
    this.isCollection = isCollection === true;
  }

  ModelContext.prototype.createModel = function(parent) {
    var cid, model, _i, _j, _len, _len1, _ref, _ref1;

    if (this.isSimpleData()) {
      if (this.parent.isCollection) {
        model = modelFactory(this.node, {
          id: this.id,
          cid: this.id,
          value: this.data
        });
        return parent.set(model);
      } else {
        return parent.set(this.id, this.data, mdl_set_options);
      }
    } else if (this.isCollection) {
      model = new Collection();
      _ref = this.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cid = _ref[_i];
        this.attributes[cid].createModel(model);
      }
      return parent.set(this.id, model, mdl_set_options);
    } else {
      model = modelFactory(this.node);
      _ref1 = this.children;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        cid = _ref1[_j];
        this.attributes[cid].createModel(model);
      }
      if (this.parent && this.parent.isCollection) {
        return parent.push(model, mdl_set_options);
      } else {
        return parent.set(this.id, model, mdl_set_options);
      }
    }
  };

  ModelContext.prototype.isSimpleData = function() {
    return this.children.length === 0 && (this.data != null);
  };

  ModelContext.prototype.hasComplexDatas = function() {
    return this.children.length !== 0;
  };

  ModelContext.prototype.setData = function(data) {
    return this.data = data;
  };

  ModelContext.prototype.addChild = function(childContext) {
    var cid;

    cid = childContext.id;
    if (this.attributes[cid] != null) {
      throw ("ModelContext#addChild  member redefinition " + cid + " in ") + this.path();
    }
    this.children.push(cid);
    this.attributes[cid] = childContext;
    return childContext.parent = this;
  };

  ModelContext.prototype.debugLog = function(tab, str) {
    var child, cid, ctxItem, _i, _j, _len, _len1, _ref;

    if (str == null) {
      str = '';
    }
    if (tab == null) {
      tab = "   ";
    }
    str += "" + tab + "Ctx " + this.id + " ########\n";
    tab += '   ';
    if (this.isSimpleData()) {
      str += "" + tab + "data :  " + this.data + " \n";
    }
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      cid = _ref[_i];
      child = this.attributes[cid];
      if (child instanceof Array) {
        str += "" + tab + cid + " : Collection \n";
        for (_j = 0, _len1 = child.length; _j < _len1; _j++) {
          ctxItem = child[_j];
          str = ctxItem.debugLog(tab, str);
        }
      } else {
        str += "" + tab + cid + " : Item \n";
        str = child.debugLog(tab, str);
      }
    }
    return str;
  };

  ModelContext.prototype.path = function() {
    var p, str;

    str = this.id;
    p = this;
    while (p = p.parent) {
      str = p.id + "/" + str;
    }
    return str;
  };

  return ModelContext;

})();

tagNameSelector = function(localName) {
  return {
    match: function(node) {
      return node.localName === localName;
    },
    data: function(node) {
      return node.innerText;
    }
  };
};

module.exports = HtmlModelParser = (function() {
  HtmlModelParser.prototype.model = null;

  HtmlModelParser.prototype.rootCtx = null;

  HtmlModelParser.prototype.ctxStack = null;

  function HtmlModelParser() {
    this.rootCtx = new ModelContext('__root__');
    this.ctxStack = [this.rootCtx];
  }

  HtmlModelParser.prototype.parse = function(htmlStr) {
    return console.log("TODO DomModel.parseHtmlString");
  };

  HtmlModelParser.prototype.parseNode = function(root) {
    this.parseNodeAndDescendants(root, this.rootCtx);
    return this.buildModel(this.rootCtx);
  };

  HtmlModelParser.prototype.isEmpty = function() {
    return this.rootCtx.children.length === 0;
  };

  HtmlModelParser.prototype.getModel = function() {
    var _ref;

    return (_ref = this.model) != null ? _ref : this.model = this.buildModel(this.rootCtx);
  };

  HtmlModelParser.prototype.buildModel = function(ctx) {
    var mdl;

    mdl = new Model;
    ctx.createModel(mdl);
    return mdl.get("__root__");
  };

  HtmlModelParser.prototype.parseNodeAndDescendants = function(node) {
    var currentChild, next;

    this.enterNode(node);
    currentChild = next = node.firstChild;
    while (currentChild = next) {
      next = currentChild.nextSibling;
      this.parseNodeAndDescendants(currentChild);
    }
    return this.exitNode(node);
  };

  HtmlModelParser.prototype.enterNode = function(node) {
    if (this.nodeHasDataStruct(node, DATA_ID_ATTR) || this.nodeHasDataStruct(node, DATA_LIST_ATTR)) {
      this.ctxStack.unshift(this.createContextFromNode(node, this.ctxStack[0]));
    }
    if (this.nodeHasDataStruct(node, DATA_SELECTOR_ATTR)) {
      return this.addSelectorsFromNode(node, this.ctxStack[0]);
    }
  };

  HtmlModelParser.prototype.exitNode = function(node) {
    var ctx;

    if (this.ctxStack[0].node !== node) {
      return;
    }
    ctx = this.ctxStack.shift();
    if ((ctx != null) && !ctx.hasComplexDatas() && !ctx.isCollection && !hasTemplate(ctx)) {
      return ctx.setData(this.getDefaultDatas(node));
    }
  };

  HtmlModelParser.prototype.nodeHasDataStruct = function(node, struct) {
    switch (node.nodeType) {
      case 1:
        return node.getAttribute(struct) != null;
      default:
        return false;
    }
  };

  HtmlModelParser.prototype.nodeMatchSelectors = function(node, selectors) {
    var selector, _i, _len;

    for (_i = 0, _len = selectors.length; _i < _len; _i++) {
      selector = selectors[_i];
      if (selector.match(node)) {
        return true;
      }
    }
    return false;
  };

  HtmlModelParser.prototype.createContextFromNode = function(node, pcontext) {
    var ctx, dataName, isList;

    dataName = node.getAttribute(DATA_ID_ATTR);
    isList = false;
    if (dataName == null) {
      dataName = node.getAttribute(DATA_LIST_ATTR);
      isList = true;
    }
    ctx = new ModelContext(dataName, isList);
    pcontext.addChild(ctx);
    ctx.node = node;
    return ctx;
  };

  HtmlModelParser.prototype.addSelectorsFromNode = function(node, ctx) {
    var name, names, sels, selsPattern, _i, _len, _ref;

    selsPattern = node.getAttribute(DATA_SELECTOR_ATTR);
    if ((_ref = ctx.selectors) == null) {
      ctx.selectors = [];
    }
    sels = ctx.selectors;
    names = selsPattern.split(",");
    for (_i = 0, _len = names.length; _i < _len; _i++) {
      name = names[_i];
      sels.push(tagNameSelector(name));
    }
  };

  HtmlModelParser.prototype.getDefaultDatas = function(node) {
    return node.innerText;
  };

  return HtmlModelParser;

})();

NodeModel = (function(_super) {
  __extends(NodeModel, _super);

  NodeModel.prototype.n_attribs = ["accesskey", "contenteditable", "contextmenu", "dir", "draggable", "dropzone", "hidden", "lang", "spellcheck", "tabindex", "title", "translate"];

  NodeModel.prototype.string = null;

  NodeModel.prototype.attribs = null;

  NodeModel.prototype.text = null;

  function NodeModel(node, attributes) {
    var attr, val, _i, _len, _ref;

    NodeModel.__super__.constructor.call(this, attributes);
    this.attribs = [];
    _ref = this.n_attribs;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      attr = _ref[_i];
      if (node.hasAttribute(attr)) {
        val = node.getAttribute(attr);
        this.set(attr, val);
        this.attribs.push([attr, val]);
      }
    }
    this.text = node.innerText;
  }

  return NodeModel;

})(Model);

LinkModel = (function(_super) {
  __extends(LinkModel, _super);

  LinkModel.prototype.n_attribs = ['href', 'hreflang', 'media', 'rel', 'target', 'type'].concat(NodeModel.prototype.n_attribs);

  function LinkModel(node, attributes) {
    LinkModel.__super__.constructor.call(this, node, attributes);
  }

  LinkModel.prototype.toString = function(params) {
    var buf, val, _i, _len, _ref;

    buf = '<a ';
    _ref = this.attribs;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      val = _ref[_i];
      buf += val[0] + '="' + val[1] + '" ';
    }
    if (params != null) {
      buf += params;
    }
    return buf += '>' + this.text + '</a>';
  };

  return LinkModel;

})(NodeModel);

modelsTemplates['A'] = LinkModel;

}});;require.define({'chaplin/models/dom_model': function(exports, require, module) {
var $, Backbone, Batcher, ComponentContext, DATA_MODELS_URL_ATTR, DATA_MODEL_ATTR, DATA_MODULE_ATTR, DATA_SELECTOR_ATTR, DomModel, EventBroker, Model, ModelLoader, ModelParser, ROOT_NAME, Root, tagNameSelector, unique, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

Model = require('chaplin/models/model');

EventBroker = require('chaplin/lib/event_broker');

Root = require('chaplin/controllers/root');

ModelParser = require('chaplin/models/html_model_parser');

$ = require('jquery');

Batcher = require('chaplin/lib/batcher');

DATA_MODULE_ATTR = "data-module";

DATA_MODELS_URL_ATTR = "data-models-url";

DATA_MODEL_ATTR = "data-model";

DATA_SELECTOR_ATTR = "data-sel";

ROOT_NAME = "__root__";

unique = 0;

ModelLoader = (function() {
  ModelLoader.extend = Backbone.Model.extend;

  _(ModelLoader.prototype).extend(Batcher.Loadable.prototype);

  _(ModelLoader.prototype).extend(Model.prototype);

  ModelLoader.prototype.context = null;

  function ModelLoader(context) {
    this.context = context;
  }

  ModelLoader.prototype.execute = function() {
    var options;

    options = {
      url: this.context.modelUrl,
      dataType: 'text'
    };
    return this.fetch(options);
  };

  ModelLoader.prototype.parse = function(html) {
    var div;

    div = document.createElement('div');
    div.innerHTML = html;
    this.context.node.appendChild(div);
    this.context.modelParser.parseNode(div);
    this._sendComplete();
    return {};
  };

  return ModelLoader;

})();

ComponentContext = (function() {
  _(ComponentContext.prototype).extend(EventBroker);

  ComponentContext.prototype.node = null;

  ComponentContext.prototype.modelUrl = null;

  ComponentContext.prototype.model = null;

  ComponentContext.prototype.parent = null;

  ComponentContext.prototype.children = null;

  ComponentContext.prototype._byId = null;

  ComponentContext.prototype.controller = null;

  ComponentContext.prototype.params = null;

  ComponentContext.prototype.id = -1;

  ComponentContext.prototype.index = -1;

  ComponentContext.prototype.childsChanged = false;

  ComponentContext.prototype.modelParser = null;

  function ComponentContext(node, name, action) {
    this.node = node;
    this.name = name;
    this.action = action;
    console.log("ComponentContext " + this.name + " # " + this.action);
    this.id = unique++;
    this.children = [];
    this.parent = null;
    this.modelUrl = null;
    this._byId = {};
    this.controller = null;
    this.params = null;
    this.index = -1;
    this.running = false;
    this.childsChanged = true;
    this.modelParser = new ModelParser;
  }

  ComponentContext.prototype.setModelUrl = function(url) {
    return this.modelUrl = url;
  };

  ComponentContext.prototype.addChild = function(comp) {
    if (this._byId[comp.id] !== void 0) {
      throw "DomModel.ComponentContex#addChild subcontext '" + comp.name + "' already exist in " + (this.path());
    }
    this.children.push(comp);
    comp.index = this._byId[comp.id] = this.children.length - 1;
    return comp.parent = this;
  };

  ComponentContext.prototype.removeChild = function(comp) {
    var index;

    if ((index = this._byId[comp.id] === void 0)) {
      throw "DomModel.ComponentContex#removeChild subcontext '" + comp.name + "' doesn't exist in " + (this.path());
    }
    this.children.splice(index, 1);
    delete this._byId[comp.id];
    return comp.parent = null;
  };

  ComponentContext.prototype.replaceBy = function(newone) {
    if (this.parent != null) {
      this.parent.replaceChild(this, newone);
      newone.parent = this.parent;
    } else {
      newone.copyChildsFrom(this);
    }
    this.parent = null;
    return this._dispose();
  };

  ComponentContext.prototype.replaceChild = function(child, newChild) {
    var index;

    newChild.index = index = this._byId[child.id];
    this.children.splice(index, 1, newChild);
    delete this._byId[child.id];
    this._byId[newChild.id] = index;
    return newChild.copyChildsFrom(child);
  };

  ComponentContext.prototype.copyChildsFrom = function(other) {
    var child, i, _i, _j, _len, _len1, _ref, _ref1, _results;

    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      child.parent = null;
    }
    this.children = other.children;
    other.children = [];
    this._byId = {};
    _ref1 = this.children;
    _results = [];
    for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
      child = _ref1[i];
      child.parent = this;
      _results.push(this._byId[child.id] = i);
    }
    return _results;
  };

  ComponentContext.prototype.fetchModel = function() {
    if (this.modelParser.isEmpty() && (this.modelUrl != null)) {
      return new ModelLoader(this);
    }
    this.model = this.modelParser.getModel();
    return null;
  };

  ComponentContext.prototype.initialize = function(Controller) {
    console.log("ControllerContext#initialize " + (this.path()) + " # " + this.action);
    if (this.controller != null) {
      return;
    }
    this.controller = new Controller;
    return this.controller.initialize(this);
  };

  ComponentContext.prototype.executeAction = function() {
    var _ref;

    if (this.running) {
      console.log("ControllerContext#executeAction already running " + (this.path()));
      return;
    }
    console.log(("ControllerContext#executeAction " + (this.path()) + ": ") + this.action);
    if ((_ref = this.model) == null) {
      this.model = this.modelParser.getModel();
    }
    this.controller[this.action](this.model, this.params);
    this.running = true;
    return this.publishEvent('component:render', this.controller);
  };

  ComponentContext.prototype.compose = function() {
    var child, i, regions, _i, _len, _ref;

    this.executeAction();
    if (this.children.length === 0) {
      return;
    }
    if (this.childsChanged) {
      regions = this.controller.createRegions(this.children.length);
    }
    _ref = this.children;
    for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
      child = _ref[i];
      child.compose();
      if (this.childsChanged) {
        child.controller.attach(regions[i]);
      }
    }
    return this.childsChanged = false;
  };

  ComponentContext.prototype.getContainer = function() {
    return this.parent.controller.getRegion(this.index);
  };

  ComponentContext.prototype._dispose = function() {
    var c, _i, _len, _ref;

    if (this.parent) {
      this.parent.removeChild(this);
    }
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      c = _ref[_i];
      if (c.parent === this) {
        c.parent = null;
      }
    }
    this.children = null;
    this.modelUrl = null;
    this.modelIds = null;
    this.modelNodes = null;
    this._byId = null;
    if (this.controller) {
      this.controller.dispose();
    }
    return this.controller = null;
  };

  ComponentContext.prototype.equal = function(other) {
    return this.name === other.name && this.modelUrl === other.modelUrl && this.action === other.action;
  };

  ComponentContext.prototype.path = function() {
    var p, str;

    str = this.name;
    p = this;
    while (p = p.parent) {
      str = p.name + "/" + str;
    }
    return str;
  };

  ComponentContext.prototype.flatten = function(flat) {
    var child, _i, _len, _ref;

    if (flat != null) {
      flat.push(this);
    } else {
      flat = [this];
    }
    _ref = this.children;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      child = _ref[_i];
      child.flatten(flat);
    }
    return flat;
  };

  return ComponentContext;

})();

tagNameSelector = function(localName) {
  return {
    match: function(node) {
      return node.localName === localName;
    },
    data: function(node) {
      return node.innerText;
    }
  };
};

module.exports = DomModel = (function(_super) {
  __extends(DomModel, _super);

  DomModel.ComponentContext = ComponentContext;

  DomModel.prototype.rootCtx = null;

  DomModel.prototype.rootnode = null;

  function DomModel(rootnode) {
    this.rootnode = rootnode;
    this.modelsLoaded = __bind(this.modelsLoaded, this);
    this.flatten = null;
    this.rootCtx = new ComponentContext(null, ROOT_NAME, 'run');
    DomModel.__super__.constructor.apply(this, arguments);
  }

  DomModel.prototype.initialize = function() {
    DomModel.__super__.initialize.apply(this, arguments);
    this.rootCtx.initialize(Root);
    return this.parse();
  };

  DomModel.prototype.parse = function(htmlStr) {
    var c, loadable, tempRoot, _i, _len, _ref;

    this.trigger("parsing");
    console.log("DomModel#parse");
    if (htmlStr != null) {
      this.rootnode.innerHTML = htmlStr;
    }
    tempRoot = new ComponentContext(null, ROOT_NAME, 'run');
    this.parseNodeAndDescendants(this.rootnode, tempRoot);
    if (!this.makeDiff(tempRoot)) {
      this.trigger("parsed");
      return this.rootCtx;
    }
    this.flatten = null;
    this.flatten = this.getFlatten();
    if (this.batcher != null) {
      this.batcher.off('complete', this.modelsLoaded);
    }
    this.batcher = new Batcher;
    _ref = this.flatten;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      c = _ref[_i];
      loadable = c.fetchModel();
      if (loadable != null) {
        this.batcher.addLoadable(loadable);
      }
    }
    if (this.batcher.getLength() === 0) {
      this.trigger("update");
      this.trigger("parsed");
      return this.rootCtx;
    }
    this.batcher.on('complete', this.modelsLoaded);
    return this.batcher.execute();
  };

  DomModel.prototype.modelsLoaded = function() {
    this.batcher.off('complete', this.modelsLoaded);
    this.batcher = null;
    this.trigger("update");
    return this.trigger("parsed");
  };

  DomModel.prototype.getFlatten = function() {
    return this.flatten = this.rootCtx.flatten().slice(1);
  };

  DomModel.prototype.fetch = function(options) {
    console.log("DomModel#fetch");
    if (options == null) {
      options = {};
    }
    options = _.defaults(options, {
      dataType: 'text'
    });
    return DomModel.__super__.fetch.call(this, options);
  };

  DomModel.prototype.makeDiff = function(newRoot) {
    var c, children, hasChanged, i, j, newCtx, newFlat, oldCtx, oldFlat, oldchildren, recycles, snapshot, stale, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _ref, _results;

    newFlat = newRoot.flatten();
    oldFlat = this.rootCtx.flatten();
    if (newFlat.length === oldFlat.length) {
      hasChanged = false;
      for (i = _i = 0, _len = newFlat.length; _i < _len; i = ++_i) {
        newCtx = newFlat[i];
        if (!newCtx.equal(oldFlat[i])) {
          hasChanged = true;
          break;
        }
      }
      if (!hasChanged) {
        for (_j = 0, _len1 = newFlat.length; _j < _len1; _j++) {
          newCtx = newFlat[_j];
          newCtx._dispose();
        }
        return false;
      }
    }
    snapshot = [];
    for (i = _k = 0, _len2 = newFlat.length; _k < _len2; i = ++_k) {
      newCtx = newFlat[i];
      snapshot[i] = [].concat(newCtx.children);
    }
    recycles = [];
    for (i = _l = 0, _len3 = newFlat.length; _l < _len3; i = ++_l) {
      newCtx = newFlat[i];
      for (j = _m = 0, _len4 = oldFlat.length; _m < _len4; j = ++_m) {
        oldCtx = oldFlat[j];
        if (oldCtx.equal(newCtx)) {
          oldFlat.splice(j, 1);
          snapshot[i] = [].concat(oldCtx.children);
          newCtx.replaceBy(oldCtx);
          newFlat[i] = oldCtx;
          break;
        }
      }
    }
    if (this.stales != null) {
      _ref = this.stales;
      for (_n = 0, _len5 = _ref.length; _n < _len5; _n++) {
        stale = _ref[_n];
        stale._dispose();
      }
    }
    this.stales = oldFlat;
    _results = [];
    for (i = _o = 0, _len6 = newFlat.length; _o < _len6; i = ++_o) {
      newCtx = newFlat[i];
      oldchildren = snapshot[i];
      children = newCtx.children;
      if (oldchildren.length !== children.length) {
        _results.push(newCtx.childsChanged = true);
      } else {
        _results.push((function() {
          var _len7, _p, _results1;

          _results1 = [];
          for (i = _p = 0, _len7 = children.length; _p < _len7; i = ++_p) {
            c = children[i];
            if (c !== oldchildren[i]) {
              newCtx.childsChanged = true;
              break;
            } else {
              _results1.push(void 0);
            }
          }
          return _results1;
        })());
      }
    }
    return _results;
  };

  DomModel.prototype.compose = function() {
    var stale, _i, _len, _ref;

    if (this.stales != null) {
      _ref = this.stales;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        stale = _ref[_i];
        stale._dispose();
      }
    }
    this.stales = null;
    return this.rootCtx.compose();
  };

  DomModel.prototype.parseNodeAndDescendants = function(node, context) {
    var currentChild, next;

    context = this.handleNode(node, context);
    currentChild = next = node.firstChild;
    while (currentChild = next) {
      next = currentChild.nextSibling;
      this.parseNodeAndDescendants(currentChild, context);
    }
    return context.modelParser.exitNode(node);
  };

  DomModel.prototype.handleNode = function(node, pcontext) {
    var ctx;

    ctx = pcontext;
    if (this.nodeHasDataStruct(node, DATA_MODULE_ATTR)) {
      ctx = this.createContextFromNode(node, ctx);
    }
    ctx.modelParser.enterNode(node);
    return ctx;
  };

  DomModel.prototype.nodeHasDataStruct = function(node, struct) {
    switch (node.nodeType) {
      case 1:
        return node.getAttribute(struct) != null;
      default:
        return false;
    }
  };

  DomModel.prototype.createContextFromNode = function(node, pcontext) {
    var action, comp_id, ctx, model_url, _ref;

    _ref = node.getAttribute(DATA_MODULE_ATTR).split('#'), comp_id = _ref[0], action = _ref[1];
    model_url = node.getAttribute(DATA_MODELS_URL_ATTR);
    ctx = new ComponentContext(node, comp_id, action);
    ctx.setModelUrl(model_url);
    pcontext.addChild(ctx);
    return ctx;
  };

  return DomModel;

})(Model);

}});;require.define({'chaplin/views/layout': function(exports, require, module) {
'use strict';
var $, Backbone, EventBroker, Layout, utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

Backbone = require('backbone');

utils = require('chaplin/lib/utils');

EventBroker = require('chaplin/lib/event_broker');

$ = Backbone.$;

module.exports = Layout = (function() {
  Layout.extend = Backbone.Model.extend;

  _(Layout.prototype).extend(EventBroker);

  Layout.prototype.title = '';

  Layout.prototype.events = {};

  Layout.prototype.el = document;

  Layout.prototype.$el = $(document);

  Layout.prototype.cid = 'chaplin-layout';

  Layout.prototype.regions = null;

  Layout.prototype._registeredRegions = null;

  function Layout() {
    this.openLink = __bind(this.openLink, this);    this.initialize.apply(this, arguments);
    this.delegateEvents();
    this.registerRegions(this, this.regions);
  }

  Layout.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.title = options.title;
    if (options.regions) {
      this.regions = options.regions;
    }
    this.settings = _(options).defaults({
      titleTemplate: _.template("<%= subtitle %> \u2013 <%= title %>"),
      openExternalToBlank: false,
      routeLinks: 'a, .go-to',
      skipRouting: '.noscript',
      scrollTo: [0, 0]
    });
    this._registeredRegions = [];
    this.subscribeEvent('beforeControllerDispose', this.hideOldView);
    this.subscribeEvent('dispatcher:dispatch', this.showNewView);
    this.publishEvent('component:render', this.showComponent);
    this.subscribeEvent('!adjustTitle', this.adjustTitle);
    this.subscribeEvent('!region:show', this.showRegion);
    this.subscribeEvent('!region:register', this.registerRegionHandler);
    this.subscribeEvent('!region:unregister', this.unregisterRegionHandler);
    if (this.settings.routeLinks) {
      return this.startLinkRouting();
    }
  };

  Layout.prototype.delegateEvents = Backbone.View.prototype.delegateEvents;

  Layout.prototype.undelegateEvents = Backbone.View.prototype.undelegateEvents;

  Layout.prototype.$ = Backbone.View.prototype.$;

  Layout.prototype.hideOldView = function(controller) {
    var scrollTo, view;

    scrollTo = this.settings.scrollTo;
    if (scrollTo) {
      window.scrollTo(scrollTo[0], scrollTo[1]);
    }
    view = controller.view;
    if (view) {
      return view.$el.hide();
    }
  };

  Layout.prototype.showNewView = function(controller) {
    var view;

    view = controller.view;
    if (view) {
      return view.$el.show();
    }
  };

  Layout.prototype.showComponent = function(controller) {
    var view;

    view = controller.view;
    if (view) {
      return view.$el.show();
    }
  };

  Layout.prototype.adjustTitle = function(subtitle) {
    var title;

    if (subtitle == null) {
      subtitle = '';
    }
    title = this.settings.titleTemplate({
      title: this.title,
      subtitle: subtitle
    });
    return setTimeout((function() {
      return document.title = title;
    }), 50);
  };

  Layout.prototype.startLinkRouting = function() {
    if (this.settings.routeLinks) {
      return $(document).on('click', this.settings.routeLinks, this.openLink);
    }
  };

  Layout.prototype.stopLinkRouting = function() {
    if (this.settings.routeLinks) {
      return $(document).off('click', this.settings.routeLinks);
    }
  };

  Layout.prototype.isExternalLink = function(link) {
    var _ref, _ref1;

    return link.target === '_blank' || link.rel === 'external' || ((_ref = link.protocol) !== 'http:' && _ref !== 'https:' && _ref !== 'file:') || ((_ref1 = link.hostname) !== location.hostname && _ref1 !== '');
  };

  Layout.prototype.openLink = function(event) {
    var $el, callback, el, external, href, isAnchor, options, path, query, skipRouting, type, _ref;

    if (utils.modifierKeyPressed(event)) {
      return;
    }
    el = event.currentTarget;
    $el = $(el);
    isAnchor = el.nodeName === 'A';
    href = $el.attr('href') || $el.data('href') || null;
    if (href === null || href === void 0 || href === '' || href.charAt(0) === '#') {
      return;
    }
    skipRouting = this.settings.skipRouting;
    type = typeof skipRouting;
    if (type === 'function' && !skipRouting(href, el) || type === 'string' && $el.is(skipRouting)) {
      return;
    }
    external = isAnchor && this.isExternalLink(el);
    if (external) {
      if (this.settings.openExternalToBlank) {
        event.preventDefault();
        window.open(el.href);
      }
      return;
    }
    if (isAnchor) {
      path = el.pathname;
      query = el.search.substring(1);
      if (path.charAt(0) !== '/') {
        path = "/" + path;
      }
    } else {
      _ref = href.split('?'), path = _ref[0], query = _ref[1];
      if (query == null) {
        query = '';
      }
    }
    options = {
      query: query
    };
    callback = function(routed) {
      if (routed) {
        event.preventDefault();
      } else if (!isAnchor) {
        location.href = path;
      }
    };
    this.publishEvent('!router:route', path, options, callback);
  };

  Layout.prototype.registerRegionHandler = function(instance, name, selector) {
    if (name != null) {
      return this.registerRegion(instance, name, selector);
    } else {
      return this.registerRegions(instance);
    }
  };

  Layout.prototype.registerRegion = function(instance, name, selector) {
    this.unregisterRegion(instance, name);
    return this._registeredRegions.unshift({
      instance: instance,
      name: name,
      selector: selector
    });
  };

  Layout.prototype.registerRegions = function(instance) {
    var name, selector, version, _i, _len, _ref;

    _ref = utils.getAllPropertyVersions(instance, 'regions');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      version = _ref[_i];
      for (selector in version) {
        name = version[selector];
        this.registerRegion(instance, name, selector);
      }
    }
  };

  Layout.prototype.unregisterRegionHandler = function(instance, name) {
    if (name != null) {
      return this.unregisterRegion(instance, name);
    } else {
      return this.unregisterRegions(instance);
    }
  };

  Layout.prototype.unregisterRegion = function(instance, name) {
    var cid;

    cid = instance.cid;
    return this._registeredRegions = _.filter(this._registeredRegions, function(region) {
      return region.instance.cid !== cid || region.name !== name;
    });
  };

  Layout.prototype.unregisterRegions = function(instance) {
    return this._registeredRegions = _.filter(this._registeredRegions, function(region) {
      return region.instance.cid !== instance.cid;
    });
  };

  Layout.prototype.showRegion = function(name, instance) {
    var region;

    region = _.find(this._registeredRegions, function(region) {
      return region.name === name && !region.instance.stale;
    });
    if (!region) {
      throw new Error("No region registered under " + name);
    }
    return instance.container = region.selector === '' ? region.instance.$el : region.instance.$(region.selector);
  };

  Layout.prototype.disposed = false;

  Layout.prototype.dispose = function() {
    if (this.disposed) {
      return;
    }
    delete this.regions;
    this.stopLinkRouting();
    this.unsubscribeAllEvents();
    this.undelegateEvents();
    delete this.title;
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Layout;

})();

}});;require.define({'chaplin/views/view': function(exports, require, module) {
'use strict';
var $, Backbone, EventBroker, View, utils, _,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

utils = require('chaplin/lib/utils');

EventBroker = require('chaplin/lib/event_broker');

$ = Backbone.$;

module.exports = View = (function(_super) {
  __extends(View, _super);

  _(View.prototype).extend(EventBroker);

  View.prototype.autoRender = false;

  View.prototype.autoAttach = true;

  View.prototype.container = null;

  View.prototype.containerMethod = 'append';

  View.prototype.regions = null;

  View.prototype.region = null;

  View.prototype.subviews = null;

  View.prototype.subviewsByName = null;

  View.prototype.stale = false;

  function View(options) {
    var render,
      _this = this;

    if (options) {
      _(this).extend(_.pick(options, ['autoAttach', 'autoRender', 'container', 'containerMethod', 'region']));
    }
    render = this.render;
    this.render = function() {
      if (_this.disposed) {
        return false;
      }
      render.apply(_this, arguments);
      return _this;
    };
    View.__super__.constructor.apply(this, arguments);
    this.delegateListeners();
    if (this.model) {
      this.listenTo(this.model, 'dispose', this.dispose);
    }
    if (this.collection) {
      this.listenTo(this.collection, 'dispose', function(subject) {
        if (!subject || subject === _this.collection) {
          return _this.dispose();
        }
      });
    }
    if (this.regions != null) {
      this.publishEvent('!region:register', this);
    }
    if (this.autoRender) {
      this.render();
    }
  }

  View.prototype.delegate = function(eventName, second, third) {
    var bound, events, handler, list, selector,
      _this = this;

    if (typeof eventName !== 'string') {
      throw new TypeError('View#delegate: first argument must be a string');
    }
    if (arguments.length === 2) {
      handler = second;
    } else if (arguments.length === 3) {
      selector = second;
      if (typeof selector !== 'string') {
        throw new TypeError('View#delegate: ' + 'second argument must be a string');
      }
      handler = third;
    } else {
      throw new TypeError('View#delegate: ' + 'only two or three arguments are allowed');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('View#delegate: ' + 'handler argument must be function');
    }
    list = _.map(eventName.split(' '), function(event) {
      return "" + event + ".delegate" + _this.cid;
    });
    events = list.join(' ');
    bound = _.bind(handler, this);
    this.$el.on(events, selector || null, bound);
    return bound;
  };

  View.prototype._delegateEvents = function(events) {
    var bound, eventName, handler, key, match, selector, value;

    for (key in events) {
      value = events[key];
      handler = typeof value === 'function' ? value : this[value];
      if (!handler) {
        throw new Error("Method '" + handler + "' does not exist");
      }
      match = key.match(/^(\S+)\s*(.*)$/);
      eventName = "" + match[1] + ".delegateEvents" + this.cid;
      selector = match[2];
      bound = _.bind(handler, this);
      this.$el.on(eventName, selector || null, bound);
    }
  };

  View.prototype.delegateEvents = function(events) {
    var classEvents, _i, _len, _ref;

    this.undelegateEvents();
    if (events) {
      this._delegateEvents(events);
      return;
    }
    if (!this.events) {
      return;
    }
    _ref = utils.getAllPropertyVersions(this, 'events');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      classEvents = _ref[_i];
      if (typeof classEvents === 'function') {
        throw new TypeError('View#delegateEvents: functions are not supported');
      }
      this._delegateEvents(classEvents);
    }
  };

  View.prototype.undelegate = function() {
    return this.$el.unbind(".delegate" + this.cid);
  };

  View.prototype.delegateListeners = function() {
    var eventName, key, method, target, version, _i, _len, _ref, _ref1;

    if (!this.listen) {
      return;
    }
    _ref = utils.getAllPropertyVersions(this, 'listen');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      version = _ref[_i];
      for (key in version) {
        method = version[key];
        if (typeof method !== 'function') {
          method = this[method];
        }
        if (typeof method !== 'function') {
          throw new Error('View#delegateListeners: ' + ("" + method + " must be function"));
        }
        _ref1 = key.split(' '), eventName = _ref1[0], target = _ref1[1];
        this.delegateListener(eventName, target, method);
      }
    }
  };

  View.prototype.delegateListener = function(eventName, target, callback) {
    var prop;

    if (target === 'model' || target === 'collection') {
      prop = this[target];
      if (prop) {
        this.listenTo(prop, eventName, callback);
      }
    } else if (target === 'mediator') {
      this.subscribeEvent(eventName, callback);
    } else if (!target) {
      this.on(eventName, callback, this);
    }
  };

  View.prototype.registerRegion = function(selector, name) {
    return this.publishEvent('!region:register', this, name, selector);
  };

  View.prototype.unregisterRegion = function(name) {
    return this.publishEvent('!region:unregister', this, name);
  };

  View.prototype.unregisterAllRegions = function() {
    return this.publishEvent('!region:unregister', this);
  };

  View.prototype.subview = function(name, view) {
    var byName, subviews, _ref, _ref1;

    subviews = (_ref = this.subviews) != null ? _ref : this.subviews = [];
    byName = (_ref1 = this.subviewsByName) != null ? _ref1 : this.subviewsByName = {};
    if (name && view) {
      this.removeSubview(name);
      subviews.push(view);
      byName[name] = view;
      return view;
    } else if (name) {
      return byName[name];
    }
  };

  View.prototype.removeSubview = function(nameOrView) {
    var byName, index, name, otherName, otherView, subviews, view, _ref, _ref1;

    if (!nameOrView) {
      return;
    }
    subviews = (_ref = this.subviews) != null ? _ref : this.subviews = [];
    byName = (_ref1 = this.subviewsByName) != null ? _ref1 : this.subviewsByName = {};
    if (typeof nameOrView === 'string') {
      name = nameOrView;
      view = byName[name];
    } else {
      view = nameOrView;
      for (otherName in byName) {
        otherView = byName[otherName];
        if (view === otherView) {
          name = otherName;
          break;
        }
      }
    }
    if (!(name && view && view.dispose)) {
      return;
    }
    view.dispose();
    index = _.indexOf(subviews, view);
    if (index !== -1) {
      subviews.splice(index, 1);
    }
    return delete byName[name];
  };

  View.prototype.getTemplateData = function() {
    var data, source;

    data = this.model ? utils.serialize(this.model) : this.collection ? {
      items: utils.serialize(this.collection),
      length: this.collection.length
    } : {};
    source = this.model || this.collection;
    if (source) {
      if (typeof source.state === 'function' && !('resolved' in data)) {
        data.resolved = source.state() === 'resolved';
      }
      if (typeof source.isSynced === 'function' && !('synced' in data)) {
        data.synced = source.isSynced();
      }
    }
    return data;
  };

  View.prototype.getTemplateFunction = function() {
    throw new Error('View#getTemplateFunction must be overridden');
  };

  View.prototype.render = function() {
    var html, templateFunc;

    if (this.disposed) {
      return false;
    }
    templateFunc = this.getTemplateFunction();
    if (typeof templateFunc === 'function') {
      html = templateFunc(this.getTemplateData());
      this.$el.html(html);
    }
    return this;
  };

  View.prototype.attach = function(container) {
    this.container = container;
    if (this.region != null) {
      this.publishEvent('!region:show', this.region, this);
    }
    $(container)[this.containerMethod](this.el);
    return this.trigger('addedToDOM');
  };

  View.prototype.detach = function() {
    return this.$el.remove();
  };

  View.prototype.disposed = false;

  View.prototype.dispose = function() {
    var prop, properties, subview, _i, _j, _len, _len1, _ref;

    if (this.disposed) {
      return;
    }
    this.unregisterAllRegions();
    if (this.subviews != null) {
      _ref = this.subviews;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subview = _ref[_i];
        subview.dispose();
      }
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    this.off();
    this.$el.remove();
    properties = ['el', '$el', 'options', 'model', 'collection', 'subviews', 'subviewsByName', '_callbacks'];
    for (_j = 0, _len1 = properties.length; _j < _len1; _j++) {
      prop = properties[_j];
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return View;

})(Backbone.View);

}});;require.define({'chaplin/views/collection_view': function(exports, require, module) {
'use strict';
var $, Backbone, CollectionView, View, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

_ = require('underscore');

Backbone = require('backbone');

View = require('chaplin/views/view');

$ = Backbone.$;

module.exports = CollectionView = (function(_super) {
  __extends(CollectionView, _super);

  CollectionView.prototype.itemView = null;

  CollectionView.prototype.autoRender = true;

  CollectionView.prototype.renderItems = true;

  CollectionView.prototype.animationDuration = 500;

  CollectionView.prototype.useCssAnimation = false;

  CollectionView.prototype.animationStartClass = 'animated-item-view';

  CollectionView.prototype.animationEndClass = 'animated-item-view-end';

  CollectionView.prototype.listSelector = null;

  CollectionView.prototype.$list = null;

  CollectionView.prototype.fallbackSelector = null;

  CollectionView.prototype.$fallback = null;

  CollectionView.prototype.loadingSelector = null;

  CollectionView.prototype.$loading = null;

  CollectionView.prototype.itemSelector = null;

  CollectionView.prototype.filterer = null;

  CollectionView.prototype.filterCallback = function(view, included) {
    return view.$el.stop(true, true).toggle(included);
  };

  CollectionView.prototype.visibleItems = null;

  function CollectionView(options) {
    this.renderAllItems = __bind(this.renderAllItems, this);
    this.toggleFallback = __bind(this.toggleFallback, this);
    this.itemsReset = __bind(this.itemsReset, this);
    this.itemRemoved = __bind(this.itemRemoved, this);
    this.itemAdded = __bind(this.itemAdded, this);    if (options) {
      _(this).extend(_.pick(options, ['renderItems', 'itemView']));
    }
    this.visibleItems = [];
    CollectionView.__super__.constructor.apply(this, arguments);
  }

  CollectionView.prototype.initialize = function(options) {
    if (options == null) {
      options = {};
    }
    this.addCollectionListeners();
    if (options.filterer != null) {
      return this.filter(options.filterer);
    }
  };

  CollectionView.prototype.addCollectionListeners = function() {
    this.listenTo(this.collection, 'add', this.itemAdded);
    this.listenTo(this.collection, 'remove', this.itemRemoved);
    return this.listenTo(this.collection, 'reset sort', this.itemsReset);
  };

  CollectionView.prototype.getTemplateData = function() {
    var templateData;

    templateData = {
      length: this.collection.length
    };
    if (typeof this.collection.state === 'function') {
      templateData.resolved = this.collection.state() === 'resolved';
    }
    if (typeof this.collection.isSynced === 'function') {
      templateData.synced = this.collection.isSynced();
    }
    return templateData;
  };

  CollectionView.prototype.getTemplateFunction = function() {};

  CollectionView.prototype.render = function() {
    CollectionView.__super__.render.apply(this, arguments);
    this.$list = this.listSelector ? this.$(this.listSelector) : this.$el;
    this.initFallback();
    this.initLoadingIndicator();
    if (this.renderItems) {
      return this.renderAllItems();
    }
  };

  CollectionView.prototype.itemAdded = function(item, collection, options) {
    return this.insertView(item, this.renderItem(item), options.at);
  };

  CollectionView.prototype.itemRemoved = function(item) {
    return this.removeViewForItem(item);
  };

  CollectionView.prototype.itemsReset = function() {
    return this.renderAllItems();
  };

  CollectionView.prototype.initFallback = function() {
    if (!this.fallbackSelector) {
      return;
    }
    this.$fallback = this.$(this.fallbackSelector);
    this.on('visibilityChange', this.toggleFallback);
    this.listenTo(this.collection, 'syncStateChange', this.toggleFallback);
    return this.toggleFallback();
  };

  CollectionView.prototype.toggleFallback = function() {
    var visible;

    visible = this.visibleItems.length === 0 && (typeof this.collection.isSynced === 'function' ? this.collection.isSynced() : true);
    return this.$fallback.toggle(visible);
  };

  CollectionView.prototype.initLoadingIndicator = function() {
    if (!(this.loadingSelector && typeof this.collection.isSyncing === 'function')) {
      return;
    }
    this.$loading = this.$(this.loadingSelector);
    this.listenTo(this.collection, 'syncStateChange', this.toggleLoadingIndicator);
    return this.toggleLoadingIndicator();
  };

  CollectionView.prototype.toggleLoadingIndicator = function() {
    var visible;

    visible = this.collection.length === 0 && this.collection.isSyncing();
    return this.$loading.toggle(visible);
  };

  CollectionView.prototype.getItemViews = function() {
    var itemViews, name, view, _ref;

    itemViews = {};
    if (this.subviewsByName) {
      _ref = this.subviewsByName;
      for (name in _ref) {
        view = _ref[name];
        if (name.slice(0, 9) === 'itemView:') {
          itemViews[name.slice(9)] = view;
        }
      }
    }
    return itemViews;
  };

  CollectionView.prototype.filter = function(filterer, filterCallback) {
    var included, index, item, view, _i, _len, _ref;

    this.filterer = filterer;
    if (filterCallback) {
      this.filterCallback = filterCallback;
    }
    if (filterCallback == null) {
      filterCallback = this.filterCallback;
    }
    if (!_(this.getItemViews()).isEmpty()) {
      _ref = this.collection.models;
      for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
        item = _ref[index];
        included = typeof filterer === 'function' ? filterer(item, index) : true;
        view = this.subview("itemView:" + item.cid);
        if (!view) {
          throw new Error('CollectionView#filter: ' + ("no view found for " + item.cid));
        }
        this.filterCallback(view, included);
        this.updateVisibleItems(view.model, included, false);
      }
    }
    return this.trigger('visibilityChange', this.visibleItems);
  };

  CollectionView.prototype.renderAllItems = function() {
    var cid, index, item, items, remainingViewsByCid, view, _i, _j, _len, _len1, _ref;

    items = this.collection.models;
    this.visibleItems = [];
    remainingViewsByCid = {};
    for (_i = 0, _len = items.length; _i < _len; _i++) {
      item = items[_i];
      view = this.subview("itemView:" + item.cid);
      if (view) {
        remainingViewsByCid[item.cid] = view;
      }
    }
    _ref = this.getItemViews();
    for (cid in _ref) {
      if (!__hasProp.call(_ref, cid)) continue;
      view = _ref[cid];
      if (!(cid in remainingViewsByCid)) {
        this.removeSubview("itemView:" + cid);
      }
    }
    for (index = _j = 0, _len1 = items.length; _j < _len1; index = ++_j) {
      item = items[index];
      view = this.subview("itemView:" + item.cid);
      if (view) {
        this.insertView(item, view, index, false);
      } else {
        this.insertView(item, this.renderItem(item), index);
      }
    }
    if (items.length === 0) {
      return this.trigger('visibilityChange', this.visibleItems);
    }
  };

  CollectionView.prototype.renderItem = function(item) {
    var view;

    view = this.subview("itemView:" + item.cid);
    if (!view) {
      view = this.initItemView(item);
      this.subview("itemView:" + item.cid, view);
    }
    view.render();
    return view;
  };

  CollectionView.prototype.initItemView = function(model) {
    if (this.itemView) {
      return new this.itemView({
        model: model,
        autoRender: false
      });
    } else {
      throw new Error('The CollectionView#itemView property ' + 'must be defined or the initItemView() must be overridden.');
    }
  };

  CollectionView.prototype.insertView = function(item, view, position, enableAnimation) {
    var $list, $next, $previous, $viewEl, children, childrenLength, included, insertInMiddle, isEnd, length, method, viewEl,
      _this = this;

    if (enableAnimation == null) {
      enableAnimation = true;
    }
    if (this.animationDuration === 0) {
      enableAnimation = false;
    }
    if (typeof position !== 'number') {
      position = this.collection.indexOf(item);
    }
    included = typeof this.filterer === 'function' ? this.filterer(item, position) : true;
    viewEl = view.el;
    $viewEl = view.$el;
    if (included && enableAnimation) {
      if (this.useCssAnimation) {
        $viewEl.addClass(this.animationStartClass);
      } else {
        $viewEl.css('opacity', 0);
      }
    }
    if (this.filterer) {
      this.filterCallback(view, included);
    }
    length = this.collection.length;
    insertInMiddle = (0 < position && position < length);
    isEnd = function(length) {
      return length === 0 || position === length;
    };
    $list = this.$list;
    if (insertInMiddle || this.itemSelector) {
      children = $list.children(this.itemSelector);
      childrenLength = children.length;
      if (children.get(position) !== viewEl) {
        if (isEnd(childrenLength)) {
          $list.append(viewEl);
        } else {
          if (position === 0) {
            $next = children.eq(position);
            $next.before(viewEl);
          } else {
            $previous = children.eq(position - 1);
            $previous.after(viewEl);
          }
        }
      }
    } else {
      method = isEnd(length) ? 'append' : 'prepend';
      $list[method](viewEl);
    }
    view.trigger('addedToParent');
    this.updateVisibleItems(item, included);
    if (included && enableAnimation) {
      if (this.useCssAnimation) {
        setTimeout(function() {
          return $viewEl.addClass(_this.animationEndClass);
        }, 0);
      } else {
        $viewEl.animate({
          opacity: 1
        }, this.animationDuration);
      }
    }
  };

  CollectionView.prototype.removeViewForItem = function(item) {
    this.updateVisibleItems(item, false);
    return this.removeSubview("itemView:" + item.cid);
  };

  CollectionView.prototype.updateVisibleItems = function(item, includedInFilter, triggerEvent) {
    var includedInVisibleItems, visibilityChanged, visibleItemsIndex;

    if (triggerEvent == null) {
      triggerEvent = true;
    }
    visibilityChanged = false;
    visibleItemsIndex = _(this.visibleItems).indexOf(item);
    includedInVisibleItems = visibleItemsIndex !== -1;
    if (includedInFilter && !includedInVisibleItems) {
      this.visibleItems.push(item);
      visibilityChanged = true;
    } else if (!includedInFilter && includedInVisibleItems) {
      this.visibleItems.splice(visibleItemsIndex, 1);
      visibilityChanged = true;
    }
    if (visibilityChanged && triggerEvent) {
      this.trigger('visibilityChange', this.visibleItems);
    }
    return visibilityChanged;
  };

  CollectionView.prototype.dispose = function() {
    var prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    properties = ['$list', '$fallback', '$loading', 'visibleItems'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      delete this[prop];
    }
    return CollectionView.__super__.dispose.apply(this, arguments);
  };

  return CollectionView;

})(View);

}});;require.define({'chaplin/lib/history': function(exports, require, module) {
'use strict';
var Backbone, EventBroker, History, _, _ref,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EventBroker = require('chaplin/lib/event_broker');

Backbone = require('backbone');

_ = require('underscore');

module.exports = History = (function(_super) {
  __extends(History, _super);

  function History() {
    _ref = History.__super__.constructor.apply(this, arguments);
    return _ref;
  }

  _(History.prototype).extend(EventBroker);

  History.prototype.loadUrl = function(fragmentOverride) {
    var fragment, matched;

    fragment = this.fragment = this.getFragment(fragmentOverride);
    this.publishEvent('router:fallback', fragment);
    return true;
    matched = _.filter(this.handlers, function(handler) {
      return handler.route.test(fragment);
    });
    matched = _.map(matched, function(handler) {
      return handler.callback(fragment);
    });
    if (matched.length > 0) {
      this.publishEvent('router:matches', matched);
      return true;
    }
    this.publishEvent('router:fallback', fragment);
    return false;
  };

  return History;

})(Backbone.History);

}});;require.define({'chaplin/lib/route': function(exports, require, module) {
'use strict';
var Backbone, Controller, EventBroker, Route, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

Controller = require('chaplin/controllers/controller');

module.exports = Route = (function() {
  var escapeRegExp;

  Route.extend = Backbone.Model.extend;

  _(Route.prototype).extend(EventBroker);

  escapeRegExp = /[-[\]{}()+?.,\\^$|#\s]/g;

  function Route(pattern, controller, action, options) {
    var _ref;

    this.pattern = pattern;
    this.controller = controller;
    this.action = action;
    this.handler = __bind(this.handler, this);
    this.addParamName = __bind(this.addParamName, this);
    if (_.isRegExp(this.pattern)) {
      throw new Error('Route: RegExps are not supported.\
        Use strings with :names and `constraints` option of route');
    }
    this.options = options ? _.clone(options) : {};
    if (this.options.name != null) {
      this.name = this.options.name;
    }
    if (this.name && this.name.indexOf('#') !== -1) {
      throw new Error('Route: "#" cannot be used in name');
    }
    if ((_ref = this.name) == null) {
      this.name = this.controller + '#' + this.action;
    }
    this.paramNames = [];
    if (_(Controller.prototype).has(this.action)) {
      throw new Error('Route: You should not use existing controller ' + 'properties as action names');
    }
    this.createRegExp();
    if (typeof Object.freeze === "function") {
      Object.freeze(this);
    }
  }

  Route.prototype.matches = function(criteria) {
    var name, property, _i, _len, _ref;

    if (typeof criteria === 'string') {
      return criteria === this.name;
    } else {
      _ref = ['name', 'action', 'controller'];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        property = criteria[name];
        if (property && property !== this[name]) {
          return false;
        }
      }
      return true;
    }
  };

  Route.prototype.reverse = function(params) {
    var index, name, url, value, _i, _len, _ref;

    url = this.pattern;
    if (_.isArray(params)) {
      if (params.length < this.paramNames.length) {
        return false;
      }
      index = 0;
      url = url.replace(/[:*][^\/\?]+/g, function(match) {
        var result;

        result = params[index];
        index += 1;
        return result;
      });
    } else {
      _ref = this.paramNames;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        name = _ref[_i];
        value = params[name];
        if (value === void 0) {
          return false;
        }
        url = url.replace(RegExp("[:*]" + name, "g"), value);
      }
    }
    if (this.test(url)) {
      return url;
    } else {
      return false;
    }
  };

  Route.prototype.createRegExp = function() {
    var pattern;

    pattern = this.pattern.replace(escapeRegExp, '\\$&').replace(/(?::|\*)(\w+)/g, this.addParamName);
    return this.regExp = RegExp("^" + pattern + "(?=\\?|$)");
  };

  Route.prototype.addParamName = function(match, paramName) {
    this.paramNames.push(paramName);
    if (match.charAt(0) === ':') {
      return '([^\/\?]+)';
    } else {
      return '(.*?)';
    }
  };

  Route.prototype.test = function(path) {
    var constraint, constraints, matched, name, params;

    matched = this.regExp.test(path);
    if (!matched) {
      return false;
    }
    constraints = this.options.constraints;
    if (constraints) {
      params = this.extractParams(path);
      for (name in constraints) {
        if (!__hasProp.call(constraints, name)) continue;
        constraint = constraints[name];
        if (!constraint.test(params[name])) {
          return false;
        }
      }
    }
    return true;
  };

  Route.prototype.handler = function(path, options) {
    var params, query, _ref;

    options = options ? _.clone(options) : {};
    query = (_ref = options.query) != null ? _ref : this.getCurrentQuery();
    params = this.buildParams(path, query);
    delete options.query;
    return {
      path: path,
      action: this.action,
      controller: this.controller,
      name: this.name,
      query: query,
      params: params,
      options: options
    };
  };

  Route.prototype.getCurrentQuery = function() {
    return location.search.substring(1);
  };

  Route.prototype.buildParams = function(path, query) {
    return _.extend({}, this.extractQueryParams(query), this.extractParams(path), this.options.params);
  };

  Route.prototype.extractParams = function(path) {
    var index, match, matches, paramName, params, _i, _len, _ref;

    params = {};
    matches = this.regExp.exec(path);
    _ref = matches.slice(1);
    for (index = _i = 0, _len = _ref.length; _i < _len; index = ++_i) {
      match = _ref[index];
      paramName = this.paramNames.length ? this.paramNames[index] : index;
      params[paramName] = match;
    }
    return params;
  };

  Route.prototype.extractQueryParams = function(query) {
    var current, field, pair, pairs, params, value, _i, _len, _ref;

    params = {};
    if (!query) {
      return params;
    }
    pairs = query.split('&');
    for (_i = 0, _len = pairs.length; _i < _len; _i++) {
      pair = pairs[_i];
      if (!pair.length) {
        continue;
      }
      _ref = pair.split('='), field = _ref[0], value = _ref[1];
      if (!field.length) {
        continue;
      }
      field = decodeURIComponent(field);
      value = decodeURIComponent(value);
      current = params[field];
      if (current) {
        if (current.push) {
          current.push(value);
        } else {
          params[field] = [current, value];
        }
      } else {
        params[field] = value;
      }
    }
    return params;
  };

  return Route;

})();

}});;require.define({'chaplin/lib/router': function(exports, require, module) {
'use strict';
var Backbone, Chaplin, EventBroker, History, Route, Router, utils, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

Route = require('chaplin/lib/route');

History = require('chaplin/lib/history');

utils = require('chaplin/lib/utils');

Chaplin = require('chaplin');

module.exports = Router = (function() {
  Router.extend = Backbone.Model.extend;

  _(Router.prototype).extend(EventBroker);

  function Router(options) {
    this.options = options != null ? options : {};
    this.route = __bind(this.route, this);
    this.match = __bind(this.match, this);
    _(this.options).defaults({
      pushState: true,
      root: '/'
    });
    this.removeRoot = new RegExp('^' + utils.escapeRegExp(this.options.root) + '(#)?');
    this.subscribeEvent('!router:route', this.routeHandler);
    this.subscribeEvent('!router:routeByName', this.routeByNameHandler);
    this.subscribeEvent('!router:reverse', this.reverseHandler);
    this.subscribeEvent('!router:changeURL', this.changeURLHandler);
    this.createHistory();
  }

  Router.prototype.createHistory = function() {
    return Chaplin.history || (Chaplin.history = new History());
  };

  Router.prototype.startHistory = function() {
    return Chaplin.history.start(this.options);
  };

  Router.prototype.stopHistory = function() {
    if (History.started) {
      return Chaplin.history.stop();
    }
  };

  Router.prototype.match = function(pattern, target, options) {
    var action, controller, route, _ref;

    if (options == null) {
      options = {};
    }
    if (arguments.length === 2 && typeof target === 'object') {
      options = target;
      controller = options.controller, action = options.action;
      if (!(controller && action)) {
        throw new Error('Router#match must receive either target or ' + 'options.controller & options.action');
      }
    } else {
      controller = options.controller, action = options.action;
      if (controller || action) {
        throw new Error('Router#match cannot use both target and ' + 'options.controller / options.action');
      }
      _ref = target.split('#'), controller = _ref[0], action = _ref[1];
    }
    route = new Route(pattern, controller, action, options);
    Chaplin.history.handlers.push({
      route: route,
      callback: route.handler
    });
    return route;
  };

  Router.prototype.route = function(path, options) {
    var handler, matches, url, _i, _len, _ref;

    options = options ? _.clone(options) : {};
    _(options).defaults({
      changeURL: true
    });
    path = path.replace(this.removeRoot, '');
    this.publishEvent('router:fallback', path, options);
    url = path + (options.query ? "?" + options.query : "");
    this.changeURL(url);
    return true;
    matches = [];
    _ref = Chaplin.history.handlers;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      handler = _ref[_i];
      if (handler.route.test(path)) {
        matches.push(handler.callback(path, options));
      }
    }
    if (matches.length > 0) {
      this.publishEvent('router:matches', matches);
      url = path + (options.query ? "?" + options.query : "");
      this.changeURL(url);
      return true;
    }
    return false;
  };

  Router.prototype.routeHandler = function(path, options, callback) {
    var routed;

    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }
    routed = this.route(path, options);
    return typeof callback === "function" ? callback(routed) : void 0;
  };

  Router.prototype.routeByNameHandler = function(name, params, options, callback) {
    var path, routed;

    if (arguments.length === 3 && typeof options === 'function') {
      callback = options;
      options = {};
    }
    path = this.reverse(name, params);
    if (typeof path === 'string') {
      routed = this.route(path, options);
      return typeof callback === "function" ? callback(routed) : void 0;
    } else {
      return typeof callback === "function" ? callback(false) : void 0;
    }
  };

  Router.prototype.reverse = function(criteria, params) {
    var handler, handlers, reversed, root, url, _i, _len;

    root = this.options.root;
    handlers = Chaplin.history.handlers;
    for (_i = 0, _len = handlers.length; _i < _len; _i++) {
      handler = handlers[_i];
      if (!(handler.route.matches(criteria))) {
        continue;
      }
      reversed = handler.route.reverse(params);
      if (reversed !== false) {
        url = root ? root + reversed : reversed;
        return url;
      }
    }
    return false;
  };

  Router.prototype.reverseHandler = function(name, params, callback) {
    return callback(this.reverse(name, params));
  };

  Router.prototype.changeURL = function(url, options) {
    var navigateOptions;

    if (options == null) {
      options = {};
    }
    navigateOptions = {
      trigger: options.trigger === true,
      replace: options.replace === true
    };
    return Chaplin.history.navigate(url, navigateOptions);
  };

  Router.prototype.changeURLHandler = function(url, options) {
    return this.changeURL(url, options);
  };

  Router.prototype.disposed = false;

  Router.prototype.dispose = function() {
    if (this.disposed) {
      return;
    }
    this.stopHistory();
    delete Chaplin.history;
    this.unsubscribeAllEvents();
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Router;

})();

}});;require.define({'chaplin/lib/delayer': function(exports, require, module) {
'use strict';
var Delayer;

Delayer = {
  setTimeout: function(name, time, handler) {
    var handle, wrappedHandler, _ref,
      _this = this;

    if ((_ref = this.timeouts) == null) {
      this.timeouts = {};
    }
    this.clearTimeout(name);
    wrappedHandler = function() {
      delete _this.timeouts[name];
      return handler();
    };
    handle = setTimeout(wrappedHandler, time);
    this.timeouts[name] = handle;
    return handle;
  },
  clearTimeout: function(name) {
    if (!(this.timeouts && (this.timeouts[name] != null))) {
      return;
    }
    clearTimeout(this.timeouts[name]);
    delete this.timeouts[name];
  },
  clearAllTimeouts: function() {
    var handle, name, _ref;

    if (!this.timeouts) {
      return;
    }
    _ref = this.timeouts;
    for (name in _ref) {
      handle = _ref[name];
      this.clearTimeout(name);
    }
  },
  setInterval: function(name, time, handler) {
    var handle, _ref;

    this.clearInterval(name);
    if ((_ref = this.intervals) == null) {
      this.intervals = {};
    }
    handle = setInterval(handler, time);
    this.intervals[name] = handle;
    return handle;
  },
  clearInterval: function(name) {
    if (!(this.intervals && this.intervals[name])) {
      return;
    }
    clearInterval(this.intervals[name]);
    delete this.intervals[name];
  },
  clearAllIntervals: function() {
    var handle, name, _ref;

    if (!this.intervals) {
      return;
    }
    _ref = this.intervals;
    for (name in _ref) {
      handle = _ref[name];
      this.clearInterval(name);
    }
  },
  clearDelayed: function() {
    this.clearAllTimeouts();
    this.clearAllIntervals();
  }
};

if (typeof Object.freeze === "function") {
  Object.freeze(Delayer);
}

module.exports = Delayer;

}});;require.define({'chaplin/lib/event_broker': function(exports, require, module) {
'use strict';
var EventBroker, mediator,
  __slice = [].slice;

mediator = require('chaplin/mediator');

EventBroker = {
  subscribeEvent: function(type, handler) {
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#subscribeEvent: ' + 'type argument must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBroker#subscribeEvent: ' + 'handler argument must be a function');
    }
    mediator.unsubscribe(type, handler, this);
    return mediator.subscribe(type, handler, this);
  },
  unsubscribeEvent: function(type, handler) {
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#unsubscribeEvent: ' + 'type argument must be a string');
    }
    if (typeof handler !== 'function') {
      throw new TypeError('EventBroker#unsubscribeEvent: ' + 'handler argument must be a function');
    }
    return mediator.unsubscribe(type, handler);
  },
  unsubscribeAllEvents: function() {
    return mediator.unsubscribe(null, null, this);
  },
  publishEvent: function() {
    var args, type;

    type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (typeof type !== 'string') {
      throw new TypeError('EventBroker#publishEvent: ' + 'type argument must be a string');
    }
    return mediator.publish.apply(mediator, [type].concat(__slice.call(args)));
  }
};

if (typeof Object.freeze === "function") {
  Object.freeze(EventBroker);
}

module.exports = EventBroker;

}});;require.define({'chaplin/lib/support': function(exports, require, module) {
'use strict';
var support;

support = {
  propertyDescriptors: (function() {
    var error, o;

    if (!(typeof Object.defineProperty === 'function' && typeof Object.defineProperties === 'function')) {
      return false;
    }
    try {
      o = {};
      Object.defineProperty(o, 'foo', {
        value: 'bar'
      });
      return o.foo === 'bar';
    } catch (_error) {
      error = _error;
      return false;
    }
  })()
};

module.exports = support;

}});;require.define({'chaplin/lib/composition': function(exports, require, module) {
'use strict';
var Backbone, Composition, EventBroker, _,
  __hasProp = {}.hasOwnProperty;

_ = require('underscore');

Backbone = require('backbone');

EventBroker = require('chaplin/lib/event_broker');

module.exports = Composition = (function() {
  Composition.extend = Backbone.Model.extend;

  _(Composition.prototype).extend(Backbone.Events);

  _(Composition.prototype).extend(EventBroker);

  Composition.prototype.item = null;

  Composition.prototype.options = null;

  Composition.prototype._stale = false;

  function Composition(options) {
    if (options != null) {
      this.options = _.clone(options);
    }
    this.item = this;
    this.initialize(this.options);
  }

  Composition.prototype.initialize = function() {};

  Composition.prototype.compose = function() {};

  Composition.prototype.check = function(options) {
    return _.isEqual(this.options, options);
  };

  Composition.prototype.stale = function(value) {
    var item, name;

    if (value == null) {
      return this._stale;
    }
    this._stale = value;
    for (name in this) {
      item = this[name];
      if (item && item !== this && _(item).has('stale')) {
        item.stale = value;
      }
    }
  };

  Composition.prototype.disposed = false;

  Composition.prototype.dispose = function() {
    var obj, prop, properties, _i, _len;

    if (this.disposed) {
      return;
    }
    for (prop in this) {
      if (!__hasProp.call(this, prop)) continue;
      obj = this[prop];
      if (obj && typeof obj.dispose === 'function') {
        if (obj !== this) {
          obj.dispose();
          delete this[prop];
        }
      }
    }
    this.unsubscribeAllEvents();
    this.stopListening();
    properties = ['redirected'];
    for (_i = 0, _len = properties.length; _i < _len; _i++) {
      prop = properties[_i];
      delete this[prop];
    }
    this.disposed = true;
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  };

  return Composition;

})();

}});;require.define({'chaplin/lib/sync_machine': function(exports, require, module) {
'use strict';
var STATE_CHANGE, SYNCED, SYNCING, SyncMachine, UNSYNCED, event, _fn, _i, _len, _ref;

UNSYNCED = 'unsynced';

SYNCING = 'syncing';

SYNCED = 'synced';

STATE_CHANGE = 'syncStateChange';

SyncMachine = {
  _syncState: UNSYNCED,
  _previousSyncState: null,
  syncState: function() {
    return this._syncState;
  },
  isUnsynced: function() {
    return this._syncState === UNSYNCED;
  },
  isSynced: function() {
    return this._syncState === SYNCED;
  },
  isSyncing: function() {
    return this._syncState === SYNCING;
  },
  unsync: function() {
    var _ref;

    if ((_ref = this._syncState) === SYNCING || _ref === SYNCED) {
      this._previousSync = this._syncState;
      this._syncState = UNSYNCED;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  beginSync: function() {
    var _ref;

    if ((_ref = this._syncState) === UNSYNCED || _ref === SYNCED) {
      this._previousSync = this._syncState;
      this._syncState = SYNCING;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  finishSync: function() {
    if (this._syncState === SYNCING) {
      this._previousSync = this._syncState;
      this._syncState = SYNCED;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  },
  abortSync: function() {
    if (this._syncState === SYNCING) {
      this._syncState = this._previousSync;
      this._previousSync = this._syncState;
      this.trigger(this._syncState, this, this._syncState);
      this.trigger(STATE_CHANGE, this, this._syncState);
    }
  }
};

_ref = [UNSYNCED, SYNCING, SYNCED, STATE_CHANGE];
_fn = function(event) {
  return SyncMachine[event] = function(callback, context) {
    if (context == null) {
      context = this;
    }
    this.on(event, callback, context);
    if (this._syncState === event) {
      return callback.call(context);
    }
  };
};
for (_i = 0, _len = _ref.length; _i < _len; _i++) {
  event = _ref[_i];
  _fn(event);
}

if (typeof Object.freeze === "function") {
  Object.freeze(SyncMachine);
}

module.exports = SyncMachine;

}});;require.define({'chaplin/lib/batcher': function(exports, require, module) {
'use strict';
var Backbone, Batcher, LoadableClass, SyncMachine, _,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

_ = require('underscore');

Backbone = require('backbone');

SyncMachine = require('./sync_machine');

LoadableClass = (function() {
  function LoadableClass() {}

  LoadableClass.extend = Backbone.Model.extend;

  _(LoadableClass.prototype).extend(Backbone.Events);

  LoadableClass.prototype.execute = function() {};

  LoadableClass.prototype._sendComplete = function() {
    return this.trigger('complete', this);
  };

  return LoadableClass;

})();

module.exports = Batcher = (function() {
  Batcher.extend = Backbone.Model.extend;

  _(Batcher.prototype).extend(LoadableClass.prototype);

  Batcher.Loadable = LoadableClass;

  Batcher.prototype.loadables = null;

  Batcher.prototype.getLength = function() {
    return this.loadables.length;
  };

  function Batcher() {
    this.itemComplete = __bind(this.itemComplete, this);    _(this).extend(SyncMachine);
    this.loadables = [];
  }

  Batcher.prototype.addLoadable = function(loadable) {
    if (!this.isUnsynced()) {
      throw "Batcher#addLoadable is running!";
    }
    return this.loadables.push(loadable);
  };

  Batcher.prototype.execute = function() {
    var l, _i, _len, _ref, _results;

    if (!this.isUnsynced()) {
      return;
    }
    this.beginSync();
    this.loadables = _.uniq(this.loadables);
    _ref = this.loadables;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      l = _ref[_i];
      l.on('complete', this.itemComplete);
      _results.push(l.execute());
    }
    return _results;
  };

  Batcher.prototype.itemComplete = function(item) {
    var index;

    index = _.indexOf(this.loadables, item);
    item.off('complete', this.itemComplete);
    this.loadables.splice(index, 1);
    if (this.loadables.length === 0) {
      this.finishSync();
      return this._sendComplete();
    }
  };

  return Batcher;

})();

}});;require.define({'chaplin/lib/utils': function(exports, require, module) {
'use strict';
var support, utils, _,
  __slice = [].slice,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

_ = require('underscore');

support = require('chaplin/lib/support');

utils = {
  beget: (function() {
    var ctor;

    if (typeof Object.create === 'function') {
      return Object.create;
    } else {
      ctor = function() {};
      return function(obj) {
        ctor.prototype = obj;
        return new ctor;
      };
    }
  })(),
  serialize: function(data) {
    if (typeof data.serialize === 'function') {
      return data.serialize();
    } else if (typeof data.toJSON === 'function') {
      return data.toJSON();
    } else {
      throw new TypeError('utils.serialize: Unknown data was passed');
    }
  },
  readonly: (function() {
    var readonlyDescriptor;

    if (support.propertyDescriptors) {
      readonlyDescriptor = {
        writable: false,
        enumerable: true,
        configurable: false
      };
      return function() {
        var obj, prop, properties, _i, _len;

        obj = arguments[0], properties = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
        for (_i = 0, _len = properties.length; _i < _len; _i++) {
          prop = properties[_i];
          readonlyDescriptor.value = obj[prop];
          Object.defineProperty(obj, prop, readonlyDescriptor);
        }
        return true;
      };
    } else {
      return function() {
        return false;
      };
    }
  })(),
  getPrototypeChain: function(object) {
    var chain, _ref;

    chain = [object.constructor.prototype];
    while (object = (_ref = object.constructor) != null ? _ref.__super__ : void 0) {
      chain.push(object);
    }
    return chain;
  },
  getAllPropertyVersions: function(object, property) {
    var proto, result, value, _i, _len, _ref;

    result = [];
    _ref = utils.getPrototypeChain(object);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      proto = _ref[_i];
      value = proto[property];
      if (value && __indexOf.call(result, value) < 0) {
        result.push(value);
      }
    }
    return result.reverse();
  },
  upcase: function(str) {
    return str.charAt(0).toUpperCase() + str.substring(1);
  },
  escapeRegExp: function(str) {
    return String(str || '').replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  },
  modifierKeyPressed: function(event) {
    return event.shiftKey || event.altKey || event.ctrlKey || event.metaKey;
  }
};

if (typeof Object.seal === "function") {
  Object.seal(utils);
}

module.exports = utils;

}});;require.define({'chaplin/lib/helpers': function(exports, require, module) {
'use strict';
var helpers, mediator;

mediator = require('chaplin/mediator');

helpers = {
  reverse: function(routeName, params) {
    var url;

    url = null;
    mediator.publish('!router:reverse', routeName, params, function(result) {
      if (result === false) {
        throw new Error('Chaplin.helpers.reverse: invalid route specified.');
      }
      return url = result;
    });
    return url;
  }
};

module.exports = helpers;

}});;require.define({'chaplin/tree/node': function(exports, require, module) {
var Backbone, Node, _;

Backbone = require('backbone');

_ = require('underscore');

module.exports = Node = (function() {
  Node.extend = Backbone.Model.extend;

  _(Node.prototype).extend(Backbone.Events);

  Node.prototype.id = null;

  Node.prototype.parent = null;

  Node.prototype.children = null;

  Node.prototype.cmap = null;

  function Node(parent) {
    var _ref;

    if ((_ref = this.parent) == null) {
      this.parent = parent;
    }
    this.children = [];
    this.cmap = {};
  }

  Node.prototype.describe = function(data) {
    return this.id = data.id;
  };

  Node.prototype.getChildren = function() {
    return [].concat(this.children);
  };

  Node.prototype.getChild = function(id) {
    var c;

    c = this.cmap[id];
    if (c != null) {
      return c;
    }
    return null;
  };

  Node.prototype.addChild = function(node) {
    var c;

    c = this.cmap[node.id];
    if (c != null) {
      return c;
    }
    this.children.push(node);
    this.cmap[node.id] = node;
    return node;
  };

  Node.prototype.dispose = function() {
    var child, _i, _len, _ref;

    if (this.children != null) {
      _ref = this.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        child = _ref[_i];
        child.dispose();
      }
    }
    this.children = null;
    this.parent = null;
    return this.cmap = null;
  };

  return Node;

})();

}});;require.define({'chaplin/tree/path': function(exports, require, module) {
var PARAM_SEP, Path, SEPARATOR, SiteTree;

SiteTree = require('./sitetree');

SEPARATOR = '/';

PARAM_SEP = '?';

module.exports = Path = (function() {
  Path.prototype.path = null;

  Path.prototype.params = null;

  Path.prototype._nodes = null;

  Path.prototype._segments = null;

  Path.prototype._valid = false;

  function Path(path, params) {
    if (path == null) {
      path = '';
    }
    this.solve(path);
    this.params = params != null ? params : {};
  }

  Path.prototype.toNode = function() {
    var nodes;

    nodes = this.toNodes();
    if (!this._valid) {
      return null;
    }
    return nodes[nodes.length - 1];
  };

  Path.prototype.toNodes = function() {
    var _ref;

    if ((_ref = this._nodes) == null) {
      this._nodes = this._solveNodes();
    }
    return [].concat(this._nodes);
  };

  Path.prototype.segments = function() {
    var _ref;

    return (_ref = this._segments) != null ? _ref : this._segments = this._buildSegments();
  };

  Path.prototype.solve = function(path) {
    var i, j, l, _ref;

    _ref = path.split(PARAM_SEP), this.path = _ref[0], this.params = _ref[1];
    i = 0;
    l = this.path.length;
    while (this.path[i] === SEPARATOR && i < l) {
      i++;
    }
    l--;
    if (i === l) {
      return this.path = '';
    }
    j = l;
    while (this.path[j] === SEPARATOR && j > -1) {
      j--;
    }
    if (i > 0 || j !== l) {
      return this.path = this.path.slice(i, +j + 1 || 9e9);
    }
  };

  Path.prototype._solveNodes = function() {
    var current, ns, seg, segs, st, valid, _i, _len;

    segs = this.segments();
    st = SiteTree.getInstance();
    current = st.rootNode;
    ns = [current];
    valid = true;
    for (_i = 0, _len = segs.length; _i < _len; _i++) {
      seg = segs[_i];
      current = current.getChild(seg);
      if (current === null) {
        valid = false;
        break;
      }
      ns.push(current);
    }
    this._valid = valid;
    return ns;
  };

  Path.prototype._buildSegments = function() {
    if (this.path === '') {
      return [];
    }
    return this.path.split(SEPARATOR);
  };

  Path.prototype.dispose = function() {
    this.path = null;
    this.params = null;
    return this._nodes = null;
  };

  return Path;

})();

}});;require.define({'chaplin/tree/sitetree': function(exports, require, module) {
var Node, SiteTree, instance,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Node = require('./node');

instance = null;

module.exports = SiteTree = (function() {
  function SiteTree() {
    this.nodeChange = __bind(this.nodeChange, this);    this.rootNode = new Node;
    this.rootNode.describe({
      id: ''
    });
    this.rootNode.on('node:change', this.nodeChange);
  }

  SiteTree.prototype.nodeChange = function(event) {
    return console.log(event);
  };

  SiteTree.prototype.getNode = function(route) {};

  SiteTree.prototype.buildTree = function(data, target) {
    var node, sub, _i, _len, _ref, _results;

    if (target == null) {
      target = this.rootNode;
    }
    if (data.childs == null) {
      return;
    }
    _ref = data.childs;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      sub = _ref[_i];
      node = this.nodeFactory(sub, target);
      node = target.addChild(node);
      _results.push(this.buildTree(sub, node));
    }
    return _results;
  };

  SiteTree.prototype.nodeFactory = function(data, parent) {
    var node;

    node = new Node(parent);
    node.describe(data);
    return node;
  };

  SiteTree.prototype.dispose = function() {
    var _ref;

    if ((_ref = this.rootNode) != null) {
      _ref.dispose();
    }
    this.rootNode = null;
    return instance = null;
  };

  return SiteTree;

})();

SiteTree.getInstance = function() {
  return instance != null ? instance : instance = new SiteTree;
};

}});;require.define({'chaplin': function(exports, require, module) {
module.exports = {
  Application: require('chaplin/application'),
  mediator: require('chaplin/mediator'),
  Dispatcher: require('chaplin/dispatcher'),
  Controller: require('chaplin/controllers/controller'),
  CompositeController: require('chaplin/controllers/composite'),
  Root: require('chaplin/controllers/root'),
  Composer: require('chaplin/composer'),
  Composition: require('chaplin/lib/composition'),
  Collection: require('chaplin/models/collection'),
  Model: require('chaplin/models/model'),
  HtmlModelParser: require('chaplin/models/html_model_parser'),
  DomModel: require('chaplin/models/dom_model'),
  Layout: require('chaplin/views/layout'),
  View: require('chaplin/views/view'),
  CollectionView: require('chaplin/views/collection_view'),
  History: require('chaplin/lib/history'),
  Route: require('chaplin/lib/route'),
  Router: require('chaplin/lib/router'),
  Delayer: require('chaplin/lib/delayer'),
  EventBroker: require('chaplin/lib/event_broker'),
  helpers: require('chaplin/lib/helpers'),
  support: require('chaplin/lib/support'),
  SyncMachine: require('chaplin/lib/sync_machine'),
  Batcher: require('chaplin/lib/batcher'),
  utils: require('chaplin/lib/utils'),
  Node: require('chaplin/tree/node'),
  Path: require('chaplin/tree/path'),
  SiteTree: require('chaplin/tree/sitetree')
};

}});