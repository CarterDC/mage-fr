/* -------------------------------------------- */
/*  ChatMessage Override                        */
/* -------------------------------------------- */


/**
 * Modification of the ChatMessage class
 * Primarily meant to allow for stealth rolls.
 * Also used by the alias system
 * Note : stealth rolls are any message with a 'stealthroll' flag true,
 * when blind and whispered, theses messages ARE NOT EVEN DISPLAYED TO THEIR SENDER
 */
 export default class M20eChatMessage extends ChatMessage {
  constructor(data, context) {
    super(data, context);
  }

  /**
   * Updates message with the 'stealthroll' flag set to true
   * todo : check if await is needed ?
   * @override
   */
  applyRollMode(rollMode) {
    if (rollMode === 'stealthroll') {
      this.data.update({['flags.stealthroll']: true});
      rollMode = "blindroll";
    }
    super.applyRollMode(rollMode);
  }

  /**
   * Don't display stealth rolls unless user isGM
   * @override
   */
  async getHTML() {
    if ( this.data.flags.stealthroll && this.data.blind && this.data.whisper.length) {
      if ( game.user.isGM ) {
        return super.getHTML();
      }
    } else {
      return super.getHTML();
    }
  }
}