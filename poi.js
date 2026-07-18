(function () {
    'use strict';

    const DATA_URL = '../../data/marker_world.json';
    let markerData = null;
    let flatRows = []; // {setKey, setLabel, id, marker}
    let editing = null; // {setKey, id} or 'new'

    const statusEl = document.getElementById('status-msg');
    const rowsEl = document.getElementById('poi-rows');
    const searchBox = document.getElementById('search-box');
    const formContainer = document.getElementById('form-container');

    function escapeHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function loadData() {
        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then(function (json) {
                markerData = json;
                statusEl.textContent = 'Loaded data/marker_world.json. Once you finished edits, download the json file and upload it to the github repo.';
                rebuildFlatRows();
                renderRows();
            })
            .catch(function (err) {
                statusEl.textContent = 'Failed to load ' + DATA_URL + ' (' + err.message + '). ' +
                    'If you are opening this file directly (file://), run it through a local web server instead, ' +
                    'or use the file picker below.';
                addFilePicker();
            });
    }

    function addFilePicker() {
        const label = document.createElement('label');
        label.style.cssText = 'display:block;margin:8px 0;font-size:13px;';
        label.innerHTML = 'Load a local marker_world.json instead: ';
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', function () {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function () {
                try {
                    markerData = JSON.parse(reader.result);
                    statusEl.textContent = 'Loaded ' + file.name + ' from disk.';
                    rebuildFlatRows();
                    renderRows();
                } catch (e) {
                    statusEl.textContent = 'Could not parse that file as JSON.';
                }
            };
            reader.readAsText(file);
        });
        label.appendChild(input);
        formContainer.appendChild(label);
    }

    function rebuildFlatRows() {
        flatRows = [];
        if (!markerData || !markerData.sets) return;
        Object.keys(markerData.sets).forEach(function (setKey) {
            const set = markerData.sets[setKey];
            const markers = (set && set.markers && !Array.isArray(set.markers)) ? set.markers : {};
            Object.keys(markers).forEach(function (id) {
                flatRows.push({ setKey: setKey, setLabel: set.label || setKey, id: id, marker: markers[id] });
            });
        });
    }

    function matchesSearch(row, term) {
        if (!term) return true;
        term = term.toLowerCase();
        const m = row.marker;
        return (row.setLabel || '').toLowerCase().includes(term) ||
            (m.label || '').toLowerCase().includes(term) ||
            (m.dial || '').toLowerCase().includes(term) ||
            (m.info || '').toLowerCase().includes(term);
    }

    function renderRows() {
        const term = searchBox.value.trim();
        rowsEl.innerHTML = '';
        flatRows
            .filter(function (r) { return matchesSearch(r, term); })
            .forEach(function (row) {
                const tr = document.createElement('tr');
                const m = row.marker;
                tr.innerHTML =
                    '<td>' + escapeHtml(row.setLabel) + '</td>' +
                    '<td>' + escapeHtml(m.label) + '</td>' +
                    '<td>' + escapeHtml(m.dial) + '</td>' +
                    '<td>' + escapeHtml(m.x) + '</td>' +
                    '<td>' + escapeHtml(m.y) + '</td>' +
                    '<td>' + escapeHtml(m.z) + '</td>' +
                    '<td>' + escapeHtml(m.icon) + '</td>' +
                    '<td style="white-space:nowrap;">' +
                    '<button class="btn btn-edit" data-set="' + row.setKey + '" data-id="' + row.id + '">Edit</button> ' +
                    '<button class="btn btn-delete" data-set="' + row.setKey + '" data-id="' + row.id + '">Delete</button>' +
                    '</td>';
                rowsEl.appendChild(tr);
            });

        rowsEl.querySelectorAll('.btn-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                openForm(btn.getAttribute('data-set'), btn.getAttribute('data-id'));
            });
        });
        rowsEl.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const setKey = btn.getAttribute('data-set');
                const id = btn.getAttribute('data-id');
                if (!confirm('Delete this POI? This cannot be undone (until you re-download the original file).')) return;
                delete markerData.sets[setKey].markers[id];
                rebuildFlatRows();
                renderRows();
            });
        });
    }

    function getSetOptions() {
        return Object.keys(markerData.sets).map(function (k) {
            const label = markerData.sets[k].label || k;
            return '<option value="' + k + '">' + escapeHtml(label) + ' (' + k + ')</option>';
        }).join('');
    }

    function openForm(setKey, id) {
        editing = setKey ? { setKey: setKey, id: id } : 'new';
        const m = setKey ? markerData.sets[setKey].markers[id] : {
            label: '', x: '', y: '64', z: '', icon: 'building', info: '', dial: '', wiki: ''
        };

        formContainer.innerHTML =
            '<div class="poi-form">' +
            '<label>Set' +
            '<select id="f-set">' + getSetOptions() + '</select></label>' +
            '<label>Label <input id="f-label" type="text" value="' + escapeHtml(m.label) + '"></label>' +
            '<label>Info <input id="f-info" type="text" value="' + escapeHtml(m.info) + '"></label>' +
            '<label>X <input id="f-x" type="text" value="' + escapeHtml(m.x) + '"></label>' +
            '<label>Y <input id="f-y" type="text" value="' + escapeHtml(m.y || '64') + '"></label>' +
            '<label>Z <input id="f-z" type="text" value="' + escapeHtml(m.z) + '"></label>' +
            '<label>Icon <input id="f-icon" type="text" value="' + escapeHtml(m.icon || 'building') + '"></label>' +
            '<label>Dial (no /dial) <input id="f-dial" type="text" value="' + escapeHtml(m.dial) + '"></label>' +
            '<label>Wiki URL <input id="f-wiki" type="text" value="' + escapeHtml(m.wiki) + '"></label>' +
            '<div class="poi-form-actions">' +
            '<button class="btn btn-save" id="f-save">Save</button>' +
            '<button class="btn btn-cancel" id="f-cancel">Cancel</button>' +
            '</div></div>';

        if (setKey) {
            formContainer.querySelector('#f-set').value = setKey;
        }

        document.getElementById('f-save').addEventListener('click', saveForm);
        document.getElementById('f-cancel').addEventListener('click', function () {
            editing = null;
            formContainer.innerHTML = '';
        });
    }

    function nextIdFor(setKey) {
        const markers = markerData.sets[setKey].markers || {};
        let max = 0;
        Object.keys(markers).forEach(function (k) {
            const n = parseInt(k, 10);
            if (!isNaN(n) && n > max) max = n;
        });
        return String(max + 1);
    }

    function saveForm() {
        const newSetKey = document.getElementById('f-set').value;
        const entry = {
            label: document.getElementById('f-label').value.trim(),
            info: document.getElementById('f-info').value.trim(),
            x: document.getElementById('f-x').value.trim(),
            y: document.getElementById('f-y').value.trim(),
            z: document.getElementById('f-z').value.trim(),
            icon: document.getElementById('f-icon').value.trim() || 'building',
            dial: document.getElementById('f-dial').value.trim(),
            wiki: document.getElementById('f-wiki').value.trim()
        };
        if (!entry.wiki) delete entry.wiki;

        if (editing === 'new') {
            if (!markerData.sets[newSetKey].markers) markerData.sets[newSetKey].markers = {};
            const id = nextIdFor(newSetKey);
            markerData.sets[newSetKey].markers[id] = entry;
        } else {
            // If the set changed, move the marker between sets under a fresh id.
            if (newSetKey !== editing.setKey) {
                delete markerData.sets[editing.setKey].markers[editing.id];
                if (!markerData.sets[newSetKey].markers) markerData.sets[newSetKey].markers = {};
                const id = nextIdFor(newSetKey);
                markerData.sets[newSetKey].markers[id] = entry;
            } else {
                markerData.sets[editing.setKey].markers[editing.id] = entry;
            }
        }

        editing = null;
        formContainer.innerHTML = '';
        rebuildFlatRows();
        renderRows();
    }

    function downloadJson() {
        if (!markerData) return;
        const blob = new Blob([JSON.stringify(markerData, null, 4)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'marker_world.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }

    document.getElementById('add-new-btn').addEventListener('click', function () { openForm(null, null); });
    document.getElementById('download-btn').addEventListener('click', downloadJson);
    searchBox.addEventListener('input', renderRows);

    loadData();
})();
