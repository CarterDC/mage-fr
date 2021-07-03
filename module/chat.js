
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

