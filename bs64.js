(function (win, doc, nav) {
    'use strict';

    var util = {
        selectNode: function (node) {
            var range = doc.createRange(),
                selection = win.getSelection();

            selection.removeAllRanges();
            range.selectNodeContents(node);
            selection.addRange(range);
            return selection;
        },

        preventEvent: function (event) {
            event.preventDefault();
            event.stopPropagation();
        },

        copyNodeText: function (node) {
            var copied = false,
                selection = this.selectNode(node);

            try {
                copied = doc.execCommand('copy');
            } catch (error) {}
            selection.removeAllRanges();

            return copied;
        },

        isCopySupported: function () {
            var ua, data;

            if (!doc.queryCommandSupported) {
                return false;
            }

            ua = nav.userAgent.toLowerCase();
            data = ua.match(/(opr)\/(\d+)/) ||
                   ua.match(/(edge)\/(\d+)/) ||
                   ua.match(/(chrome|firefox)\/(\d+)/);

            if (data) {
                data[2] = win.Number(data[2]);
                switch (data[1]) {
                    case 'opr':
                        return data[2] >= 29;

                    case 'edge':
                        return data[2] >= 12;

                    case 'chrome':
                        return data[2] >= 43;

                    case 'firefox':
                        return data[2] >= 41;
                }
            }

            return false;
        }
    };

    // Toast

    var Toast = function Toast(element) {
        this.timer = 0;
        this.element = element || doc.createElement('div');
    };

    Toast.prototype.hide = function () {
        this.element.classList.add('hidden');
        return this;
    };

    Toast.prototype.show = function (message) {
        win.clearTimeout(this.timer);
        this.element.textContent = message;
        this.element.classList.remove('hidden');
        this.timer = win.setTimeout(this.hide.bind(this), 2000);
        return this;
    };

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

    var toast = new Toast(doc.getElementById('toast')),
        filter = new TextInput(doc.getElementById('filter')),
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
            listItem.querySelector('.item-date').textContent = new win.Date(item.date).toLocaleString();
            listItem.querySelector('.item-value').textContent = itemLink.href = item.value;
            listItem.querySelector('[data-action="copyValue"]').dataset.index = index;
            listItem.querySelector('[data-action="deleteItem"]').dataset.index = index;
            if (item.imageFile) {
                listItem.querySelector('.item-image').src = item.value;
            }
            listFragment.appendChild(listItem);
        });

        resultList.innerHTML = '';
        resultList.appendChild(listFragment);
        resultList.scrollTop = 0;
    };

    var uploadHandler = function (event) {
        var count,
            files = event.dataTransfer ?
                    event.dataTransfer.files : event.target.files;

        util.preventEvent(event);

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
                    date: (new win.Date()).getTime(),
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
    doc.addEventListener('dragover', util.preventEvent, false);
    doc.addEventListener('dragenter', util.preventEvent, false);

    doc.documentElement.classList.toggle('copying', util.isCopySupported());

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

            case 'copyValue':
                if (util.copyNodeText(doc.querySelectorAll('.item-value')[target.dataset.index])) {
                    toast.show(doc.documentElement.dataset.messageCopied);
                }
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
        var target = event.target;

        if (target.nodeType !== this.ELEMENT_NODE || !target.classList.contains('selectable')) {
            return;
        }

        util.selectNode(target);
        util.preventEvent(event);
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
        nav.serviceWorker
            .register('/bs64/sw.js', {
                scope: '/bs64/'
            })
            .then(
                function (reg) {
                    var active = reg.active;

                    reg.onupdatefound = function (event) {
                        this.installing.onstatechange = function (event) {
                            if (this.state === 'installed') {
                                toast.show(doc.documentElement.dataset[active ? 'messageUpdated' : 'messageReady']);
                            }
                        };
                    };

                    console.log('Registration succeeded. Scope is ' + reg.scope);
                },
                function (error) {
                    console.log('Registration failed with ' + error);
                }
            );
    }
})(this, this.document, this.navigator);
