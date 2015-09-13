(function (win, doc, nav) {
    'use strict';

    // Storage

    var Storage = function Storage(name) {
        this.name = name;
        this.data = win.localStorage[name] ?
                    win.JSON.parse(win.localStorage[name]) : {};
    };

    Storage.prototype.getValue = function (key) {
        return this.data[key];
    };

    Storage.prototype.setValue = function (key, value) {
        this.data[key] = value;
        try {
            win.localStorage[this.name] = win.JSON.stringify(this.data);
        } catch (error) {}
        return this;
    };

    // TextInput

    var TextInput = function TextInput(element) {
        var self = this;
        this.element = element || doc.createElement('input');
        this.element.addEventListener('input', function () {
            self.onInput(this.value);
            this.classList.toggle('empty', !this.value);
        }, false);
    };

    TextInput.prototype.onInput = function () {};

    TextInput.prototype.getValue = function () {
        return this.element.value;
    };

    TextInput.prototype.setFocus = function (focus) {
        this.element[focus ? 'focus' : 'blur']();
        return this;
    };

    TextInput.prototype.setValue = function (value) {
        this.element.value = value;
        this.element.dispatchEvent(new win.Event('input'));
        return this;
    };

    // Initialization

    var filter = new TextInput(doc.getElementById('filter')),
        storage = new Storage('bs64'),
        listItems = storage.getValue('items') || [],
        fileInput = doc.getElementById('fileInput'),
        resultList = doc.getElementById('resultList'),
        listItemTemplate = doc.getElementById('listItemTemplate');

    var renderItems = function () {
        var listFragment = doc.createDocumentFragment();

        doc.documentElement.classList.toggle('empty', !listItems.length);

        filter.setValue('');
        fileInput.value = '';

        listItems.sort(function (itemA, itemB) {
            return itemA.date < itemB.date;
        });

        storage.setValue('items', listItems);

        listItems.forEach(function (item, index) {
            var listItem = doc.importNode(listItemTemplate.content, true),
                itemLink = listItem.querySelector('.item-link');

            itemLink.download = itemLink.textContent = item.name;
            listItem.querySelector('.item-date').textContent = item.date;
            listItem.querySelector('.item-value').textContent = itemLink.href = item.value;
            listItem.querySelector('[data-action="deleteItem"]').dataset.index = index;
            if (item.imageFile) {
                listItem.querySelector('.item-image').src = item.value;
            }
            listFragment.appendChild(listItem);
        });

        resultList.innerHTML = '';
        resultList.appendChild(listFragment);
    };

    var preventHandler = function (event) {
        event.preventDefault();
        event.stopPropagation();
    };

    var uploadHandler = function (event) {
        preventHandler(event);

        var count,
            files = event.dataTransfer ?
                    event.dataTransfer.files : event.target.files;

        if (!files) {
            return;
        }

        count = files.length;

        [].forEach.call(files, function (file) {
            var fr = new win.FileReader(),
                fileName = file.name,
                fileSize = file.size,
                imageFile = (/image/i).test(file.type);

            fr.onload = function (event) {
                listItems.push({
                    name: fileName,
                    size: fileSize,
                    date: (new win.Date()).toLocaleString(),
                    value: event.target.result,
                    imageFile: imageFile
                });

                if (--count <= 0) {
                    renderItems();
                }
            };

            fr.readAsDataURL(file);
         });
    };

    doc.addEventListener('drop', uploadHandler, false);
    doc.addEventListener('dragover', preventHandler, false);
    doc.addEventListener('dragenter', preventHandler, false);

    doc.addEventListener('click', function (event) {
        var target = event.target;
        while (target && target !== this) {
            if (target.hasAttribute('data-action')) {
                return this.dispatchEvent(new win.CustomEvent('action', {
                    detail: target
                }));
            }
            target = target.parentNode;
        }
    }, false);

    doc.addEventListener('action', function (event) {
        var target = event.detail;

        switch (target.dataset.action) {
            case 'upload':
                fileInput.click();
                break;

            case 'clearList':
                if (win.confirm(target.dataset.confirm)) {
                    listItems = [];
                    filter.setValue('');
                    renderItems();
                }
                break;

            case 'deleteItem':
                listItems.splice(target.dataset.index, 1);
                renderItems();
                break;

            case 'clearFilter':
                filter.setValue('').setFocus(true);
                break;
        }
    }, false);

    doc.addEventListener('dblclick', function (event) {
        var range, target = event.target;

        if (target.nodeType !== this.ELEMENT_NODE || !target.classList.contains('selectable')) {
            return;
        }

        preventHandler(event);

        range = this.createRange();
        range.selectNodeContents(target);
        win.getSelection().addRange(range);
    }, false);

    filter.setValue('');
    fileInput.value = '';

    filter.onInput = function (value) {
        value = value.trim().toLowerCase();
        [].forEach.call(doc.querySelectorAll('.item'), function (item) {
            item.hidden = item.querySelector('.item-name').textContent.toLowerCase().indexOf(value) < 0 &&
                          item.querySelector('.item-date').textContent.toLowerCase().indexOf(value) < 0;
        });
    };

    fileInput.addEventListener('change', uploadHandler, false);

    if (listItems.length) {
        renderItems();
    }

    if ('serviceWorker' in nav) {
        // TODO
    }
})(this, this.document, this.navigator);
