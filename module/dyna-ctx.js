
export class DynaCtx extends ContextMenu {

  constructor(element, selector, callback) {
    super(element, selector, []);
    this.callback = callback;
  }

  render(target) {
    if ( this.callback instanceof Function ) {
      const menuOptions = this.callback(target[0]);
      if ( !menuOptions || menuOptions === [] ) { return this.close();}
      this.menuItems = menuOptions;
      this.renderShift(target);
    }
  }

  renderShift(target) {
    let html = $("#context-menu").length ? $("#context-menu") : $('<nav id="context-menu"></nav>');
    let ol = $('<ol class="context-items"></ol>');
    html.html(ol);

    // Build menu items
    for (let item of this.menuItems) {

      // Determine menu item visibility (display unless false)
      let display = true;
      if ( item.condition !== undefined ) {
        display = ( item.condition instanceof Function ) ? item.condition(target) : item.condition;
      }
      if ( !display ) continue;

      // Construct and add the menu item
      let name = game.i18n.localize(item.name);
      let li = $(`<li class="context-item macro-ready" draggable="true" data-action="roll-throw" data-item-id="${item.itemId}" data-throw-index="${item.throwIndex}">${item.icon}${name}</li>`);
      li.children("i").addClass("fa-fw");
      li.click(e => {
        e.preventDefault();
        e.stopPropagation();
        item.callback(target, e);
        this.close();
      });
      li[0].addEventListener('dragstart', (e) => {
        const callback = item.dragDropCallbacks['dragstart'];
        callback(e);
        if ( e.dataTransfer.items.length ) e.stopPropagation();
        //this.close();
      });
      li[0].addEventListener('drop', (e) => {
        e.preventDefault();
        const callback = item.dragDropCallbacks['drop'];
        callback(e);
        this.close();
      });

      ol.append(li);
    }

    // Bail out if there are no children
    if ( ol.children().length === 0 ) return;

    // Append to target
    this._setPosition(html, target);

    // Animate open the menu
    return this._animateOpen(html);
  }
}