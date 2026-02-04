// ==UserScript==
// @name         Google Docs Labels
// @namespace    ThorsAnvil
// @version      1.5
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
    let draggedIndex = null;
    let documentId = null;
    let documentTitle = null;
    let expandedLabels = {}; // Track which labels are expanded

    // Extract document ID from URL
    function getDocumentId() {
        const match = window.location.pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    // Get document title from page
    function getDocumentTitle() {
        // Try various selectors for the document title
        const titleElement = document.querySelector('.docs-title-input') ||
                            document.querySelector('[data-tooltip="Rename"]') ||
                            document.querySelector('.docs-title-widget');
        if (titleElement) {
            return titleElement.value || titleElement.textContent || 'Untitled';
        }
        // Fallback to page title
        const pageTitle = document.title.replace(' - Google Docs', '').trim();
        return pageTitle || 'Untitled';
    }

    // Storage key for this document
    function getStorageKey() {
        return 'gd-labels-' + documentId;
    }

    // Save labels to localStorage (with document title)
    function saveLabels() {
        if (!documentId) return;
        try {
            const data = {
                labels: labels,
                title: getDocumentTitle(),
                url: window.location.href
            };
            localStorage.setItem(getStorageKey(), JSON.stringify(data));
        } catch (e) {
            console.log('Google Docs Labels: Could not save labels', e);
        }
    }

    // Load labels from localStorage
    function loadLabels() {
        if (!documentId) return;
        try {
            const saved = localStorage.getItem(getStorageKey());
            if (saved) {
                const data = JSON.parse(saved);
                // Handle both old format (array) and new format (object)
                if (Array.isArray(data)) {
                    labels = data;
                } else {
                    labels = data.labels || [];
                }
            }
        } catch (e) {
            console.log('Google Docs Labels: Could not load labels', e);
            labels = [];
        }
    }

    // Find all documents with a specific label
    function findDocumentsWithLabel(labelName) {
        const documents = [];
        const currentDocId = documentId;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('gd-labels-')) {
                try {
                    const docId = key.replace('gd-labels-', '');
                    const saved = localStorage.getItem(key);
                    const data = JSON.parse(saved);
                    
                    let docLabels = [];
                    let docTitle = 'Untitled';
                    let docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';

                    // Handle both old format (array) and new format (object)
                    if (Array.isArray(data)) {
                        docLabels = data;
                    } else {
                        docLabels = data.labels || [];
                        docTitle = data.title || 'Untitled';
                        docUrl = data.url || docUrl;
                    }

                    if (docLabels.includes(labelName)) {
                        documents.push({
                            id: docId,
                            title: docTitle,
                            url: docUrl,
                            isCurrent: docId === currentDocId
                        });
                    }
                } catch (e) {
                    // Skip invalid entries
                }
            }
        }

        return documents;
    }

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
                const labelContainer = document.createElement('div');
                labelContainer.className = 'gd-label-container';

                const labelItem = document.createElement('div');
                labelItem.style.cssText = 'padding: 4px 16px; color: #202124; font-size: 13px; cursor: grab; display: flex; align-items: center; justify-content: space-between; border-radius: 4px; transition: background-color 0.15s;';
                labelItem.draggable = true;
                labelItem.dataset.index = index;

                // Drag events
                labelItem.addEventListener('dragstart', (e) => {
                    draggedIndex = index;
                    labelItem.style.opacity = '0.5';
                    e.dataTransfer.effectAllowed = 'move';
                });

                labelItem.addEventListener('dragend', () => {
                    labelItem.style.opacity = '1';
                    draggedIndex = null;
                    // Remove all drag-over styles
                    const items = labelsListContainer.querySelectorAll('[draggable="true"]');
                    items.forEach(item => {
                        item.style.borderTop = 'none';
                        item.style.borderBottom = 'none';
                    });
                });

                labelItem.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    
                    // Visual feedback
                    const items = labelsListContainer.querySelectorAll('[draggable="true"]');
                    items.forEach(item => {
                        item.style.borderTop = 'none';
                        item.style.borderBottom = 'none';
                    });
                    
                    const targetIndex = parseInt(labelItem.dataset.index);
                    if (draggedIndex !== null && targetIndex !== draggedIndex) {
                        if (targetIndex < draggedIndex) {
                            labelItem.style.borderTop = '2px solid #1a73e8';
                        } else {
                            labelItem.style.borderBottom = '2px solid #1a73e8';
                        }
                    }
                });

                labelItem.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const targetIndex = parseInt(labelItem.dataset.index);
                    if (draggedIndex !== null && targetIndex !== draggedIndex) {
                        // Reorder the labels array
                        const draggedLabel = labels[draggedIndex];
                        labels.splice(draggedIndex, 1);
                        labels.splice(targetIndex, 0, draggedLabel);
                        saveLabels();
                        updateLabelsDisplay();
                    }
                });

                // Hover effect
                labelItem.addEventListener('mouseenter', () => {
                    labelItem.style.backgroundColor = '#f1f3f4';
                });
                labelItem.addEventListener('mouseleave', () => {
                    labelItem.style.backgroundColor = 'transparent';
                });

                // Expand/Collapse button
                const isExpanded = expandedLabels[label] || false;
                const expandBtn = document.createElement('span');
                expandBtn.className = 'gd-label-expand';
                expandBtn.style.cssText = 'color: #5f6368; cursor: pointer; margin-right: 8px; font-size: 10px; user-select: none; transition: transform 0.2s;';
                expandBtn.textContent = '▶';
                expandBtn.style.display = 'inline-block';
                expandBtn.style.transform = isExpanded ? 'rotate(90deg)' : 'rotate(0deg)';

                const dragHandle = document.createElement('span');
                dragHandle.style.cssText = 'color: #9aa0a6; margin-right: 8px; cursor: grab; font-size: 10px;';
                dragHandle.textContent = '⋮⋮';

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

                labelItem.appendChild(expandBtn);
                labelItem.appendChild(dragHandle);
                labelItem.appendChild(labelText);
                labelItem.appendChild(removeBtn);
                labelContainer.appendChild(labelItem);

                // Document list container (for expanded state)
                const docListContainer = document.createElement('div');
                docListContainer.className = 'gd-doc-list';
                docListContainer.style.cssText = 'padding-left: 32px; display: ' + (isExpanded ? 'block' : 'none') + ';';
                labelContainer.appendChild(docListContainer);

                // If expanded, populate the document list
                if (isExpanded) {
                    populateDocumentList(docListContainer, label);
                }

                // Expand/collapse click handler
                expandBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    expandedLabels[label] = !expandedLabels[label];
                    const nowExpanded = expandedLabels[label];
                    
                    expandBtn.style.transform = nowExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
                    docListContainer.style.display = nowExpanded ? 'block' : 'none';
                    
                    if (nowExpanded) {
                        populateDocumentList(docListContainer, label);
                    } else {
                        // Clear the list when collapsed
                        while (docListContainer.firstChild) {
                            docListContainer.removeChild(docListContainer.firstChild);
                        }
                    }
                });

                labelsListContainer.appendChild(labelContainer);
            });
        }
    }

    function populateDocumentList(container, labelName) {
        // Clear existing content
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        const documents = findDocumentsWithLabel(labelName);

        if (documents.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'padding: 4px 8px; color: #5f6368; font-size: 12px; font-style: italic;';
            emptyMsg.textContent = 'No documents';
            container.appendChild(emptyMsg);
        } else {
            documents.forEach(doc => {
                const docItem = document.createElement('div');
                docItem.style.cssText = 'padding: 4px 8px; font-size: 12px; border-radius: 4px; transition: background-color 0.15s;';

                if (doc.isCurrent) {
                    // Current document - show as text, not link
                    docItem.style.color = '#1a73e8';
                    docItem.style.fontWeight = '500';
                    docItem.textContent = doc.title + ' (current)';
                } else {
                    // Other documents - show as link
                    const link = document.createElement('a');
                    link.href = doc.url;
                    link.textContent = doc.title;
                    link.style.cssText = 'color: #202124; text-decoration: none;';
                    link.addEventListener('mouseenter', () => {
                        link.style.textDecoration = 'underline';
                    });
                    link.addEventListener('mouseleave', () => {
                        link.style.textDecoration = 'none';
                    });
                    docItem.appendChild(link);
                }

                // Hover effect
                docItem.addEventListener('mouseenter', () => {
                    docItem.style.backgroundColor = '#f1f3f4';
                });
                docItem.addEventListener('mouseleave', () => {
                    docItem.style.backgroundColor = 'transparent';
                });

                container.appendChild(docItem);
            });
        }
    }

    function addLabel(labelText) {
        if (labelText && labelText.trim()) {
            labels.push(labelText.trim());
            saveLabels();
            updateLabelsDisplay();
        }
    }

    function removeLabel(index) {
        labels.splice(index, 1);
        saveLabels();
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

        // Create "No labels" message (indented)
        noLabelsMessage = document.createElement('div');
        noLabelsMessage.textContent = 'No labels';
        noLabelsMessage.style.cssText = 'padding: 4px 16px 4px 32px; color: #5f6368; font-size: 12px; font-style: italic;';
        labelsSection.appendChild(noLabelsMessage);

        // Create container for labels list (indented)
        labelsListContainer = document.createElement('div');
        labelsListContainer.id = 'gd-labels-list';
        labelsListContainer.style.cssText = 'padding-left: 16px;';
        labelsSection.appendChild(labelsListContainer);

        // Insert before Document tabs
        parentContainer.insertBefore(labelsSection, documentTabsSection);

        // Load saved labels and display
        loadLabels();
        updateLabelsDisplay();

        // Update document title in storage periodically (in case it changes)
        setTimeout(() => {
            documentTitle = getDocumentTitle();
            saveLabels();
        }, 2000);

        console.log('Google Docs Labels: Labels section added successfully');
    }

    function init() {
        // Get document ID first
        documentId = getDocumentId();
        if (!documentId) {
            console.log('Google Docs Labels: Could not determine document ID');
            return;
        }

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
