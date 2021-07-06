
export function addChatListeners(html) {
    html.on('click', '.m20e.card', onCardFooterClick);
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
  
  const chatData = {
    user: game.user.id,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
    content: htmlContent,
    flavor: htmlFlavor,
    speaker: ChatMessage.getSpeaker({actor: actor})
  };
  
  ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"));
  return ChatMessage.create(chatData);
}

