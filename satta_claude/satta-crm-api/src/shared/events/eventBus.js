import { EventEmitter } from 'events'

class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(100)
  }
}

export const eventBus = new EventBus()
