// Import Helpers
import * as utils from './utils/utils.js'
import { log } from "./utils/utils.js";


export function addChatListeners(html) {
    html.on('click', '.m20e.card', onCardFooterClick);
    html.on('click', '#linkToOptions', onLinkToOptionsClick);
}

async function onLinkToOptionsClick(event) {
  event.preventDefault();
  event.stopPropagation();
  const sheet = game.settings.sheet;
  sheet._tabs[0].active = 'system';
  sheet.render(true);
}

function onCardFooterClick(event) {
  event.preventDefault();
  const card = $(event.currentTarget);
  const tip = card.find(".card-tooltip");  
  if ( !tip.is(":visible") ) tip.slideDown(200);
  else tip.slideUp(200);
}


export async function displayCard(actor, templateData) {
  const flavorTemplate = "systems/mage-fr/templates/chat/trait-flavor.hbs";
  const contentTemplate = "systems/mage-fr/templates/chat/trait-card.hbs";
  const htmlFlavor = await renderTemplate(flavorTemplate, templateData);
  const htmlContent = await renderTemplate(contentTemplate, templateData);
  log(ChatMessage.getSpeaker());
  return ChatMessage.create({
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: htmlFlavor,
    whisper:[game.user.id], //linked cards are self-whisperd by default
    //todo : look into getSpeaker !
    speaker: ChatMessage.getSpeaker({actor: actor})
  });
}

