// ==UserScript==
// @name         Google Docs Labels
// @namespace    ThorsAnvil
// @version      1.2
// @description  Adds a Labels section to Google Docs left sidebar
// @author       You
// @match        https://docs.google.com/document/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let labels = [];
    let labelsListContainer = null;
    let noLabelsMessage = null;

    function updateLabelsDisplay() {
        if (!labelsListContainer || !noLabelsMessage) return;

        // Clear current list using DOM methods
        while (labelsListContainer.firstChild) {
            labelsListContainer.removeChild(labelsListContainer.firstChild);
        }

        if (labels.length === 0) {
            noLabelsMessage.style.display = 'block';
        } else {
            noLabelsMessage.style.display = 'none';
            labels.forEach((label, index) => {
                const labelItem = document.createElement('div');
                labelItem.style.cssText = 'padding: 4px 16px; color: #202124; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;';

                const labelText = document.createElement('span');
                labelText.style.cssText = 'flex: 1;';
                labelText.textContent = label;

                const removeBtn = document.createElement('span');
                removeBtn.className = 'gd-label-remove';
                removeBtn.dataset.index = index;
                removeBtn.style.cssText = 'color: #5f6368; cursor: pointer; padding: 2px 6px; font-size: 11px;';
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    removeLabel(index);
                });

                labelItem.appendChild(labelText);
                labelItem.appendChild(removeBtn);
                labelsListContainer.appendChild(labelItem);
            });
        }
    }

    function addLabel(labelText) {
        if (labelText && labelText.trim()) {
            labels.push(labelText.trim());
            updateLabelsDisplay();
        }
    }

    function removeLabel(index) {
        labels.splice(index, 1);
        updateLabelsDisplay();
    }

    function showAddLabelDialog() {
        // Remove existing dialog if present
        const existingDialog = document.querySelector('#gd-label-dialog-overlay');
        if (existingDialog) existingDialog.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'gd-label-dialog-overlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); z-index: 10000; display: flex; align-items: center; justify-content: center;';

        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background: white; border-radius: 8px; padding: 24px; min-width: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.3);';

        // Dialog title
        const title = document.createElement('div');
        title.style.cssText = 'font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 16px;';
        title.textContent = 'Add Label';

        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'gd-label-input';
        input.placeholder = 'Enter label name';
        input.style.cssText = 'width: 100%; padding: 10px 12px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px; box-sizing: border-box; outline: none;';

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;';

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'gd-label-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding: 8px 16px; border: none; background: transparent; color: #1a73e8; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 4px;';

        // Add button
        const addBtn = document.createElement('button');
        addBtn.id = 'gd-label-add';
        addBtn.textContent = 'Add';
        addBtn.style.cssText = 'padding: 8px 16px; border: none; background: #1a73e8; color: white; font-size: 14px; font-weight: 500; cursor: pointer; border-radius: 4px;';

        // Assemble dialog
        buttonContainer.appendChild(cancelBtn);
        buttonContainer.appendChild(addBtn);
        dialog.appendChild(title);
        dialog.appendChild(input);
        dialog.appendChild(buttonContainer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // Focus input
        setTimeout(() => input.focus(), 100);

        // Event handlers
        const closeDialog = () => overlay.remove();

        cancelBtn.addEventListener('click', closeDialog);

        addBtn.addEventListener('click', () => {
            addLabel(input.value);
            closeDialog();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addLabel(input.value);
                closeDialog();
            } else if (e.key === 'Escape') {
                closeDialog();
            }
        });

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeDialog();
        });
    }

    function createLabelsSection(documentTabsSection) {
        const parentContainer = documentTabsSection.parentElement;
        if (!parentContainer) {
            console.log('Google Docs Labels: Could not find parent container');
            return;
        }

        if (document.querySelector('#gd-labels-section')) {
            return;
        }

        // Create the labels section container
        const labelsSection = document.createElement('div');
        labelsSection.id = 'gd-labels-section';

        // Copy computed styles from documentTabsSection
        const computedStyle = window.getComputedStyle(documentTabsSection);
        labelsSection.style.cssText = `
            margin-bottom: ${computedStyle.marginBottom};
            padding: ${computedStyle.padding};
        `;

        // Create header row with "Labels" text and plus button
        const headerRow = document.createElement('div');
        headerRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 16px;';

        const headerText = document.createElement('div');
        headerText.textContent = 'Labels';
        headerText.style.cssText = 'font-size: 11px; font-weight: 500; color: #5f6368; text-transform: uppercase; letter-spacing: 0.8px;';

        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.style.cssText = 'border: none; background: transparent; color: #5f6368; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1;';
        plusButton.title = 'Add label';
        plusButton.addEventListener('click', showAddLabelDialog);

        headerRow.appendChild(headerText);
        headerRow.appendChild(plusButton);
        labelsSection.appendChild(headerRow);

        // Create "No labels" message
        noLabelsMessage = document.createElement('div');
        noLabelsMessage.textContent = 'No labels';
        noLabelsMessage.style.cssText = 'padding: 4px 16px; color: #5f6368; font-size: 12px; font-style: italic;';
        labelsSection.appendChild(noLabelsMessage);

        // Create container for labels list
        labelsListContainer = document.createElement('div');
        labelsListContainer.id = 'gd-labels-list';
        labelsSection.appendChild(labelsListContainer);

        // Insert before Document tabs
        parentContainer.insertBefore(labelsSection, documentTabsSection);

        // Initial display update
        updateLabelsDisplay();

        console.log('Google Docs Labels: Labels section added successfully');
    }

    function init() {
        const observer = new MutationObserver((mutations, obs) => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim() === 'Document tabs') {
                    let section = node.parentElement;
                    for (let i = 0; i < 10 && section; i++) {
                        if (section.nextElementSibling || section.previousElementSibling) {
                            if (section.querySelector('[role="tree"], [role="button"]')) {
                                createLabelsSection(section);
                                obs.disconnect();
                                return;
                            }
                        }
                        section = section.parentElement;
                    }
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => observer.disconnect(), 30000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
