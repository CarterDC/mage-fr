/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
 export default class M20eActor extends Actor {

  /** @override */
  constructor(...args) {
    //might need to do stuff in here
    super(...args);
  }

  get paradigm() {
    return this.items.filter(item => item.type === "paradigm")[0];
  }

}
