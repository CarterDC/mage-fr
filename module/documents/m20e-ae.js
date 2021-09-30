/**
 * Not used atm, meant to deal with combat effects and duration.
 * @extends {ActiveEffect}
 */
 export class M20eActiveEffect extends ActiveEffect {

  /** @override */
  constructor(data, context) {
    super(data, context);
    //maybe something clever to do here ?
  }

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
    if ( this.parent instanceof Actor ) {
      const duration = {};
      if ( game.combat ) {
        duration.startRound = data.duration.startRound || game.combat.round ;
        duration.startTurn = data.duration.startTurn || game.combat.turn;
        duration.combat = game.combat.id;
        this.data.update({duration});
      }
    }
  }

  /**
   * Returns whether or not an effect is active (ie should be applied) relative to current combat
   */
  get isActive() {
    let isActive = true;
    try {
      if ( this.isTemporary ) {
        if ( !game.combat ) {
          //temporary + outside of combat => not active !
          isActive = false;
        } else {
          //temporary + in combat => is there any time remaining ?
          const d = this.duration; //the getter, not the data !
          isActive = d.remaining > 0;
        }
      }
    } catch {
      //try bloc could fail during world init if there are temporary effects on an actor
      //since game.combat is a getter that can't be resolved at this point in time
      isActive = false;
    } finally {
      return isActive;
    }
  }

  /**
   * Only apply if effect isActive (whatever that may mean)
   *  @override */
  apply(actor, change) {
    if ( !this.isActive ) { return; }
    super.apply(actor, change);
  }

}