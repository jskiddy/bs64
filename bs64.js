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

        formatString: function (value) {
            var args;
            if (!value) {
                return '';
            }
            args = win.Array.prototype.slice.call(arguments, 1);
            return value.replace(/\{([0-9]+)\}/g, function (m, i) {
                return args[i];
            });
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
            data = ua.match(/(opr|edge)\/(\d+)/) ||
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

    var Toast = function Toast(element, duration) {
        this.timer = 0;
        this.element = element || doc.createElement('div');
        this.duration = duration || 2000;
    };

    Toast.prototype.hide = function () {
        this.element.classList.add('hidden');
        return this;
    };

    Toast.prototype.show = function (message) {
        win.clearTimeout(this.timer);
        this.element.textContent = message;
        this.element.classList.remove('hidden');
        this.timer = win.setTimeout(this.hide.bind(this), this.duration);
        return this;
    };

    // Storage

    var Storage = function Storage(name) {
        this.name = name;

        try {
            this.data = win.JSON.parse(win.localStorage[name]);
        } catch (error) {
            this.data = {};
        }
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

    // Application

    var Application = function Application() {
        // TODO
    };

    // Initialization

    var toast = new Toast(doc.getElementById('toast'), 1200),
        filter = new TextInput(doc.getElementById('filter')),
        storage = new Storage('bs64'),
        listItems = storage.getValue('items') || [],
        fileInput = doc.getElementById('fileInput'),
        resultList = doc.getElementById('resultList'),
        listItemTemplate = doc.getElementById('listItemTemplate');

    var loadFile = function (file) {
        return new win.Promise(function (resolve, reject) {
            var fr = new win.FileReader(),
                fileName = file.name,
                fileSize = file.size,
                imageFile = (/image/i).test(file.type);

            fr.onload = function () {
                resolve({
                    name: fileName,
                    size: fileSize,
                    date: win.Date.now(),
                    value: this.result,
                    imageFile: imageFile
                });
            };

            fr.onerror = function () {
                reject(this.error);
            };

            fr.readAsDataURL(file);
        });
    };

    var loadImage = function (item) {
        return new win.Promise(function (resolve, reject) {
            var img = new win.Image();
            img.onload = img.onerror = function () {
                item.width = this.width;
                item.height = this.height;
                resolve(item);
            };
            img.src = item.value;
        });
    };

    var getMessage = function (name) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return doc.documentElement.dataset['message' + name] || '';
    };

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
                itemLink = listItem.querySelector('.item-link'),
                itemSize = listItem.querySelector('.item-size'),
                itemResolution = listItem.querySelector('.item-resolution');

            itemLink.download = itemLink.textContent = item.name;
            itemSize.textContent = util.formatString(
                itemSize.textContent,
                item.size / 1000
            );
            listItem.querySelector('.item-date').textContent = new win.Date(item.date).toLocaleString();
            listItem.querySelector('.item-value').textContent = itemLink.href = item.value;
            listItem.querySelector('[data-action="copyValue"]').dataset.index = index;
            listItem.querySelector('[data-action="deleteItem"]').dataset.index = index;
            if (item.imageFile) {
                listItem.querySelector('.item-image').src = item.value;
                itemResolution.hidden = false;
                itemResolution.textContent = util.formatString(
                    itemResolution.textContent,
                    item.width,
                    item.height
                );
            }
            listFragment.appendChild(listItem);
        });

        resultList.innerHTML = '';
        resultList.appendChild(listFragment);
        resultList.scrollTop = 0;
    };

    var processFile = function (file) {
        return loadFile(file).then(function (item) {
            return item.imageFile ? loadImage(item) : item;
        });
    };

    var uploadHandler = function (event) {
        var files = event.dataTransfer ?
                    event.dataTransfer.files : event.target.files;

        util.preventEvent(event);

        if (!files) {
            return;
        }

        win.Promise.all([].map.call(files, processFile)).then(function (items) {
            listItems = listItems.concat(items);
            renderItems();
        });
    };

    doc.documentElement.dataset.clipboard = util.isCopySupported();

    doc.addEventListener('drop', uploadHandler, false);
    doc.addEventListener('dragover', util.preventEvent, false);
    doc.addEventListener('dragenter', util.preventEvent, false);

    doc.addEventListener('click', function (event) {
        var target = event.target;
        while (target) {
            if (target.hasAttribute('data-action')) {
                return this.dispatchEvent(new win.CustomEvent('action', {
                    detail: target
                }));
            }
            target = target.parentElement;
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
                    toast.show(getMessage('copied'));
                }
                break;

            case 'clearList':
                if (win.confirm(getMessage('confirm'))) {
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
                          item.querySelector('.item-info').textContent.toLowerCase().indexOf(value) < 0;
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
                                toast.show(getMessage(active ? 'updated' : 'ready'));
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
