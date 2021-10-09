// Import Helpers
import * as utils from './utils.js'
import { log } from "./utils.js";
import Trait from './trait.js'
import DiceThrower from './dice-thrower.js'
import ParadoxDialog from './apps/paradox-dlg.js'

/* -------------------------------------------- */
/*  Sockets                                     */
/* -------------------------------------------- */

export function onSocketReceived(data) {
  if ( !game.user.isGM ) { return; }
  //only deal with socket data whose action property is 'execute'
  //callback should be the name of a function referenced in the game.m20e.socketCallbacks
  //parameters could also be objects
  if ( data.action === 'execute' ) {
    const callback = game.m20e.socketCallbacks[data.fnName]
    callback(data.parameter);
  }
}

/* -------------------------------------------- */
/*  Message Events Hanlders                     */
/* -------------------------------------------- */

/**
 * Adds new listeners to selectors inside a newly displayed message html
 * called on the Hooks.on renderChatLog
 * @param  {} html
 */
export function addChatListeners(app, html, data) {
  html.on('click', '.m20e.card', onCardFooterClick); //drawer behavior of chatmessages
  html.on('click', '.display-desc-button', onCardDescButtonClick);
  
  html.on('click', '#linkToOptions', onLinkToOptionsClick); //only present in the welcome message
}

/**
 * Adds new items to a message's contextmenu
 * called by the hooks on 'getChatLogEntryContext'
 */
export function addChatMessageContextOptions(html, options) {
  options.push(
    {
      name: game.i18n.localize("M20E.context.paradoxEffect"),
      icon: '<i class="fas fa-radiation"></i>',
      condition: liElem => {
          const message = game.messages.get(liElem.data("messageId"));
          const isEffectRoll = message._roll?.options?.data.isMagickThrow || false;
          return game.user.isGM && isEffectRoll;
      },
      callback: liElem => rollParadox(liElem)
    },
    {
        name: game.i18n.localize("M20E.context.willpowerForSuccess"),
        icon: '<i class="fas fa-balance-scale-left"></i>',
        condition: liElem => {
            const message = game.messages.get(liElem.data("messageId"));
            const isWillpowered = message._roll?.options?.isWillpowered || false;
            const isVisible = (game.user.isGM || message.isAuthor) && message.isContentVisible;
            return isVisible && message.isRoll && !isWillpowered;
        },
        callback: liElem => {
          //since it updates a message, either call the function as GM
          //or emit on the socket to have it executed by a GM
          const messageId = liElem.data("messageId");
          if ( game.user.isGM ) {
            sacrificeWillpower(messageId);
          } else {
            game.socket.emit('system.mage-fr', {
              action: 'execute',
              fnName: 'sacrificeWillpower',
              parameter : messageId
            });
          }
        }
    },
    {
      name: game.i18n.localize("M20E.context.extendThrow"),
      icon: '<i class="fas fa-sync-alt"></i>',
      condition: liElem => {
          const message = game.messages.get(liElem.data("messageId"));
          const isVisible = (game.user.isGM || message.isAuthor) && message.isContentVisible;
          return isVisible && message._roll?._total >= 0;
      },
      callback: liElem => extendThrow(liElem)
    },
    {
      name: game.i18n.localize("M20E.context.sameThrow"),
      icon: '<i class="fas fa-redo-alt"></i>',
      condition: liElem => {
          const message = game.messages.get(liElem.data("messageId"));
          return message.isContentVisible && message.isRoll;
      },
      callback: liElem => sameThrow(liElem)
    }
  );
  return options;
}

/**
 * Modifies the total of a roll inside a message in exchange for a willpower point
 * @param  {String} messageId 
 */
export async function sacrificeWillpower(messageId) {
  const message = game.messages.get(messageId);
  const actor = utils.actorFromData(message.data.speaker);
  if ( !actor ) { return; }

  //check if actor still has willpower to spend
  const willpower = actor.data.data.resources.willpower;
  if ( willpower[CONFIG.M20E.WOUNDTYPE.AGGRAVATED] < willpower.max) {
    //update message with modified roll
    const roll = message._roll;
    roll._total += 1;
    roll.options.isWillpowered = true;
    await message.update({
      content: '', //necessary to force a render of the roll template
      roll: roll.toJSON()
    });
    //remove the sacrificed willpower point
    actor.wound('willpower', 1);
  } else {
    ui.notifications.error(game.i18n.localize('M20E.notifications.notEnoughWillpower'));
  }
}

async function extendThrow(liElem) {
  const message = game.messages.get(liElem.data("messageId"));
  const actor = utils.actorFromData(message.data.speaker);
  if ( !actor ) { return; }
  log(message._roll);
}

async function sameThrow(liElem) {
  const message = game.messages.get(liElem.data("messageId"));  
  //get actor from current scene/selected token if any, or user chosen character from userConfig
  const actor = utils.getUserActor();
  if (! actor ) { return; }
  const throwData = message._roll.options;
  const traits = throwData.traits.map( traitData => {
    return Trait.fromData(traitData.path, traitData.data, traitData.itemId);
  });
  //todo add some of the throwData as options of the new throw ?
  const diceThrower = new DiceThrower({
    document: actor,
    traits: traits,
    options: throwData.options
  });
  diceThrower.render(true);
}

async function rollParadox(liElem) {
  const message = game.messages.get(liElem.data("messageId"));
  const roll = message._roll;
  const actor = utils.actorFromData(message.data.speaker);
  if ( !actor ) { return; }
  const paradlg = new ParadoxDialog(actor, roll);
  paradlg.render(true);
}

/**
 * Open the gameSetting on the system tab
 * called solely from the welcome message
 * @param  {Event} event the event that triggered (from '#linkToOptions')
 */
async function onLinkToOptionsClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const sheet = game.settings.sheet;
  sheet._tabs[0].active = 'system';
  sheet.render(true);
}

/**
 * Slowly expands or collapses the inner content of a '.m20e.card'
 * Does basically the same as Foundry vanilla roll messages 
 * @param  {Event} event the event that triggered
 */
function onCardFooterClick(event) {
  event.preventDefault();
  const card = $(event.currentTarget);
  const tip = card.find(".card-tooltip");
  if (!tip.is(":visible")) tip.slideDown(200);
  else tip.slideUp(200);
}

/**
 * Switchs display between displayDesc and sysDesc
 * TODO : finish that
 */
 function onCardDescButtonClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const button = $(event.currentTarget);
  /*const tip = card.find(".card-tooltip");
  if (!tip.is(":visible")) tip.slideDown(200);
  else tip.slideUp(200);*/
}

/**
 * Displays a Trait Card in the chat
 * @param  {M20eActor} actor The actor from which the message should originate
 * @param  {Object} templateData contains all the info needed to populate the card and it's flavor
 */
export async function displayCard(actor, templateData) {
  //populating the templates
  const flavorTemplate = "systems/mage-fr/templates/chat/trait-flavor.hbs";
  const contentTemplate = "systems/mage-fr/templates/chat/trait-card.hbs";
  const htmlFlavor = await renderTemplate(flavorTemplate, templateData);
  const htmlContent = await renderTemplate(contentTemplate, templateData);
  //send chat message
  return ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: htmlFlavor,
    whisper: [game.user.id], //linked cards are self-whisperd by default
    speaker: ChatMessage.getSpeaker({ actor: actor })
  });
}

/**
 * Creates and send a welcome chatMessage
 * flags the user so the message is displayed only once
 */
export async function welcomeMessage() {
  const msgTemplate = "systems/mage-fr/templates/chat/welcome-message.hbs";
  //prepare the template Data
  const templateData = game.i18n.localize('M20E.welcomeMessage');
  templateData.isGM = game.user.isGM;
  const module = game.modules.get(game.settings.get("mage-fr", "compendiumScope"));
  templateData.packModuleActivated = module && module.active;

  const htmlContent = await renderTemplate(msgTemplate, templateData);
  //send message
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: templateData.flavor,
    speaker: { alias: "Carter_DC" },
    whisper: [game.user.id]
  });
  //flag the user
  game.user.setFlag("mage-fr", "welcomeMessageShown", true);
}

/**
 * Creates and send a version-warning Message
 * flags the user so the message is displayed only once
 */
export async function versionWarningMessage(sysVersion) {
  const msgTemplate = "systems/mage-fr/templates/chat/welcome-message.hbs";
  //prepare the template Data
  const templateData = game.i18n.localize('M20E.versionWarning');
  templateData.header = game.i18n.format('M20E.versionWarning.header', {sysVersion: sysVersion});
  templateData.isGM = game.user.isGM;
  templateData.isVersionWarning = true;

  const htmlContent = await renderTemplate(msgTemplate, templateData);
  //send message
  ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: templateData.flavor,
    speaker: { alias: "Carter_DC" },
    whisper: [game.user.id]
  });
  //flag the user 
  game.user.setFlag("mage-fr", "versionWarning", sysVersion);
}

/* -------------------------------------------- */
/*  slash command intercept                     */
/* -------------------------------------------- */

/**
 * Called by the Hooks on "chatMessage".
 * Intercepts the input message, checks for our own custom commands (ie system rolls)
 * basically a dumb down copy of the vanilla chatLog.processMessage().
 * @returns {Boolean} true or false whether the default Foundry behavior should continue or not.
 */
 export function onProcessMessage(chatLog, message, chatData) {
  let dealtWith = false;
  // Alter the message content, if needed
  message = message.replace(/\n/g, "<br>");  
  // Parse the message to determine the matching handler
  let [command, match] = customParseMessage(message);

  // Process message data based on the identified command type
  switch (command) {
    case "mroll": case "mageroll":
      let [formula, flavor] = match.slice(2, 4);
      createSystemRollFromCommand(formula, flavor);
      dealtWith = true;
      break;
    default:
      break;
  }

  return !dealtWith; //return false if command has been dealt with in here
}

/**
 * Searches for patterns matching our own 'custom' commands.
 * basically a dumb down copy of the vanilla ChatLog#parse().
 * @param  {String} message a preprocessed string to be matched against some regex.
 * 
 * @returns a length=2 array containing our command (or 'none') and the result of the regex match
 */
function customParseMessage(message) {
  
  // Dice roll regex
  let formula = '([^#]*)';                  // Capture any string not starting with '#'
  formula += '(?:(?:#\\s?)(.*))?';          // Capture any remaining flavor text
  const mroll = '^(\\/mr(?:oll)? )';        // MageRolls, support /mr or /mroll
  const mageroll = '^(\\/mager(?:oll)? )';   // MageRolls, support /mager or /mageroll

  // Define regex patterns
  const patterns = {
    "mroll": new RegExp(mroll+formula, 'i'),
    "mageroll": new RegExp(mageroll+formula, 'i')
  };

  // Iterate over patterns, finding the first match
  let command, rgx, match;
  for ( [command, rgx] of Object.entries(patterns) ) {
    match = message.match(rgx); 
    if ( match ) return [command, match];
  }
  return ["none", [message, "", message]];
}

/**
 * Creates and sends a roll to chat, using our own custom Roll class rather than the vanilla one
 * @param  {} formula
 * @param  {} flavor
 */
async function createSystemRollFromCommand(formula, flavor) {
  //validate formula before going any further
  const rollClass = CONFIG.Dice.M20eRoll; //could also be CONFIG.Dice.rolls[1]
  if ( !rollClass.validate(formula) ) {
    ui.notifications.warn(game.i18n.format('MYSYSTEM.notifications.wrongFormula', {formula: formula}));
    return;
  }

  //get actor from current scene/selected token if any, or user chosen character from userConfig
  const msgClass = ChatMessage.implementation; //could use 'ChatMessage' directly instead
  const speaker = msgClass.getSpeaker(); //also used when sending the message
  const actor = msgClass.getSpeakerActor(speaker) || game.user.character;

  //create roll  
  const rollData = actor ? actor.getRollData() : {};
  const rollOptions = {};
  const roll = new rollClass(formula, rollData, rollOptions);

  //send roll (it will be evaluated in the .toMessage())
  //alternatively, roll could be evaluated, rendered and it's template sent as chatMessage.content
  return await roll.toMessage({
    speaker: speaker,
    flavor: flavor
  }, {rollMode: game.settings.get("core", "rollMode")});

}
