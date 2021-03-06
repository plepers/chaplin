# Main entry point into Chaplin module.
# Load all components and expose them.
module.exports =
  Application:            require 'chaplin/application'
  mediator:               require 'chaplin/mediator'
  Dispatcher:             require 'chaplin/dispatcher'
  Controller:             require 'chaplin/controllers/controller'
  CompositeController:    require 'chaplin/controllers/composite'
  Root:                   require 'chaplin/controllers/root'
  Composer:               require 'chaplin/composer'

  Composition:            require 'chaplin/lib/composition'

  Collection:             require 'chaplin/models/collection'
  Model:                  require 'chaplin/models/model'
  HtmlModelParser:        require 'chaplin/models/html_model_parser'
  DomModel:               require 'chaplin/models/dom_model'

  Layout:                 require 'chaplin/views/layout'
  View:                   require 'chaplin/views/view'
  CollectionView:         require 'chaplin/views/collection_view'

  History:                require 'chaplin/lib/history'
  Route:                  require 'chaplin/lib/route'
  Router:                 require 'chaplin/lib/router'
  Delayer:                require 'chaplin/lib/delayer'
  EventBroker:            require 'chaplin/lib/event_broker'
  helpers:                require 'chaplin/lib/helpers'
  support:                require 'chaplin/lib/support'
  SyncMachine:            require 'chaplin/lib/sync_machine'
  Batcher:                require 'chaplin/lib/batcher'
  utils:                  require 'chaplin/lib/utils'

  Node:                   require 'chaplin/tree/node'
  Path:                   require 'chaplin/tree/path'
  SiteTree:               require 'chaplin/tree/sitetree'
