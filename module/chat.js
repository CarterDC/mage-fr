// Import Helpers
import * as utils from './utils/utils.js'
import { log } from "./utils/utils.js";

/**
 * called on the Hooks.on renderChatLog, to add listeners to its html element
 * @param  {} html
 */
export function addChatListeners(app, html, data) {
  html.on('click', '.m20e.card', onCardFooterClick);
  html.on('click', '#linkToOptions', onLinkToOptionsClick);
}

export function addChatMessageContextOptions(html, options) {

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
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: templateData.welcome,
    speaker: { alias: "Carter_DC" },
    whisper: [game.user.id]
  });
  //flag the user
  game.user.setFlag("mage-fr", "welcomeMessageShown", true);
}
/*
export function testage(test) {
  game.socket.emit('system.mage-fr', {test: test});
}

export function onSocketReceived(data) {
  log(data);
}*/
