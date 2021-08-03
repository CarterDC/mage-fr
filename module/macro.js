
/**
 * Defines an override to the Hotbar._onClickMacro function
 * just add support for the shiftKey state to be passed
 * through the macro to our actual command
 */
export function registerHotbarOverride() {
  Hotbar.prototype._onClickMacro = async function(event) {
    event.preventDefault();
     const li = event.currentTarget;

    // Case 1 - create a new Macro
    if ( li.classList.contains("inactive") ) {
      const macro = await Macro.create({name: "New Macro", type: "chat", scope: "global"});
      await game.user.assignHotbarMacro(macro, Number(li.dataset.slot));
      macro.sheet.render(true);
    }

    // Case 2 - trigger a Macro
    else {
      const macro = game.macros.get(li.dataset.macroId);
      //if macro has a shiftkey flag just modify it's value
      if ( macro.data.flags['shiftKey'] !== undefined ) {
        //since it's not an update, the shiftKey value will be used only once
        //before being reset to it's default flag value
        macro.data.flags['shiftKey'] = event.shiftKey;
      }
      return macro.execute();
    }
  }
}