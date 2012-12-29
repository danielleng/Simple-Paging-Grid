﻿(function ($) {
    function dataPage(data, currentPage, pageSize) {
        return data.slice(currentPage * pageSize, currentPage * pageSize + pageSize);
    }

    var bbt = '<div style="text-align: center;"> \
            {{#if isFirstPage}} \
                <button class="btn pull-left first" disabled="disabled">&laquo; First</button> \
                <button class="btn pull-left previous" disabled="disabled">&laquo; Prev</button> \
            {{/if}} \
            {{#unless isFirstPage}} \
                <button class="btn pull-left first">&laquo; First</button> \
                <button class="btn pull-left previous">&laquo; Prev</button> \
            {{/unless}} \
            {{#if isLastPage}} \
                <button class="btn pull-right last" disabled="disabled">Last &raquo</button> \
                <button class="btn pull-right next" disabled="disabled">Next &raquo</button> \
            {{/if}} \
            {{#unless isLastPage}} \
                <button class="btn pull-right last">Last &raquo</button> \
                <button class="btn pull-right next">Next &raquo</button> \
            {{/unless}} \
            <div class="pagination"> \
                <ul> \
                    {{#each pages}} \
                        {{#if isCurrentPage}} \
                            <li class="active"><a href="#" class="pagenumber" data-pagenumber="{{pageNumber}}">{{displayPageNumber}}</a></li> \
                        {{/if}} \
                        {{#unless isCurrentPage}} \
                            <li><a href="#" class="pagenumber" data-pagenumber="{{pageNumber}}">{{displayPageNumber}}</a></li> \
                        {{/unless}} \
                    {{/each}} \
                </ul> \
            </div> \
        </div>';

    $.fn.simplePagingGrid = function (options) {
        var templates = $.extend({
            buttonBarTemplate: bbt, //'<div><button class="btn pull-left first">&laquo; First</button><button class="btn pull-left previous">&laquo; Prev</button><button class="btn pull-right last">Last &raquo</button><button class="btn pull-right next">Next &raquo</button><div class="pagination"><ul></ul></div><div class="clearfix"></div>',
            tableTemplate: '<table><thead></thead><tbody></tbody></table>',
            headerTemplate: '<th width="{{width}}">{{title}}</th>',
            sortableHeaderTemplate: '<th width="{{width}}"><div class="sort-container"><ul class="sort"><li class="sort-ascending"/><li class="sort-descending"/></ul>{{title}}</div></th>',
            emptyCellTemplate: '<td>&nbsp;</td>',
            loadingOverlayTemplate: '<div class="loading"></div>',
            currentPageTemplate: '<span class="page-number">{{pageNumber}}</span>',
            pageLinkTemplate: '<li><a class="page-number" href="#">{{pageNumber}}</a></li>',
            pageOptionsBar: '<div class="form-horizontal">' +
                                '<div class="control-group pull-left"><label class="control-label-left">Goto Page</label><div class="controls"><div class="input-append"><input type="text" class="page-picker-number span1"><button class="page-picker-button btn">Go</button></div></div></div>' +
                                '<div class="control-group pull-right"><label class="control-label">Rows Per Page</label><div class="controls"><select class="page-size-picker span1"><option selected="selected" value="10">10</option><option value="50">50</option><option value="100">100</option></select></div></div>' +
                            '<div class="clearfix"></div></div>'
        }, options.templates);

        var settings = $.extend({
            pageSize: 10,
            columnWidths: [],
            cellTemplates: null,
            cellContainerTemplates: null,
            columnDefinitionTemplates: null,
            headerTemplates: null,
            rowTemplates: ['<tr>'],
            sortable: [],
            sortOrder: "asc",
            initialSortColumn: null,
            tableClass: "table",
            dataFunction: null,
            dataUrl: null,
            data: null,
            postDataFunction: null,
            minimumVisibleRows: 10,
            showLoadingOverlay: true,
            showPageNumbers: true,
            numberOfPageLinks: 10,
            pageRenderedEvent: null,
            pageOptionsBar: false,
            alwaysShowNavigationBar: true,
            ajaxError: null,
            showHeader: true
        }, options);

        settings.templates = {};
        $.each(templates, function (index, value) {
            settings.templates[index] = Handlebars.compile(value);
        });

        if (settings.cellTemplates !== null) {
            $.each(settings.cellTemplates, function (index) {
                if (settings.cellTemplates[index] !== null) {
                    settings.cellTemplates[index] = Handlebars.compile(settings.cellTemplates[index]);
                }
            });
        }

        if (settings.cellContainerTemplates !== null) {
            $.each(settings.cellContainerTemplates, function (index) {
                if (settings.cellContainerTemplates[index] !== null) {
                    settings.cellContainerTemplates[index] = Handlebars.compile(settings.cellContainerTemplates[index]);
                }
            });
        }

        if (settings.columnDefinitionTemplates !== null) {
            $.each(settings.columnDefinitionTemplates, function (index) {
                if (settings.columnDefinitionTemplates[index] !== null) {
                    settings.columnDefinitionTemplates[index] = Handlebars.compile(settings.columnDefinitionTemplates[index]);
                }
            });
        }

        if (settings.headerTemplates !== null) {
            $.each(settings.headerTemplates, function (index) {
                if (settings.headerTemplates[index] !== null) {
                    settings.headerTemplates[index] = Handlebars.compile(settings.headerTemplates[index]);
                }
            });
        }

        if (settings.rowTemplates !== null) {
            $.each(settings.rowTemplates, function (index) {
                if (settings.rowTemplates[index] !== null) {
                    settings.rowTemplates[index] = Handlebars.compile(settings.rowTemplates[index]);
                }
            });
        }

        return this.each(function () {
            var buttonBarHtml;
            var table;
            var tbody;
            var thead;
            var headerRow;
            var currentPage = 0;
            var buttonBar;
            var firstButton;
            var previousButton;
            var nextButton;
            var lastButton;
            var pageTextPicker;
            var pageData;
            var numberOfRows = null;
            var sortOrder = settings.sortOrder;
            var sortedColumn = settings.initialSortColumn;
            var sortElement = null;
            var loadingOverlay = null;
            var gridElement = this;
            var $this = $(this);

            function numberOfPages() {
                if (numberOfRows !== null) {
                    return Math.ceil(numberOfRows / settings.pageSize);
                }
                return Number.MAX_VALUE;
            }

            function getPageRange() {
                var totalPages = numberOfPages();
                var firstPage;
                var lastPage;
                firstPage = (currentPage + 1) - settings.numberOfPageLinks / 2;
                if (firstPage < 1) {
                    firstPage = 1;
                    lastPage = settings.numberOfPageLinks;
                    if (lastPage > totalPages) {
                        lastPage = totalPages;
                    }
                }
                else {
                    lastPage = (currentPage + 1) + settings.numberOfPageLinks / 2 - 1;
                    if (lastPage > totalPages) {
                        lastPage = totalPages;
                        firstPage = lastPage - settings.numberOfPageLinks + 1;
                        if (firstPage < 1) firstPage = 1;
                    }
                }

                return {
                    firstPage: firstPage,
                    lastPage: lastPage
                };
            }

            function buildButtonBar() {
                var previousButtonBar = buttonBar;
                //if (numberOfRows !== null) {
                    var totalPages = numberOfPages();
                    var pageRange = getPageRange();
                    var pageIndex;
                    var hadFocus = false;

                    if (pageTextPicker !== undefined) {
                        hadFocus = pageTextPicker.is(":focus");
                    }

                    var paginationModel = {
                        isFirstPage: currentPage == 0,
                        isLastPage: currentPage == totalPages - 1,
                        currentPage: currentPage + 1,
                        totalPages: totalPages,
                        pages: []
                    };
                    for (pageIndex = pageRange.firstPage; pageIndex <= pageRange.lastPage; pageIndex++) {
                        paginationModel.pages.push({ pageNumber: pageIndex - 1, displayPageNumber: pageIndex, isCurrentPage: (pageIndex - 1) == currentPage });
                    }
                    buttonBarHtml = settings.templates.buttonBarTemplate(paginationModel);
                    buttonBar = $(buttonBarHtml);
                    firstButton = buttonBar.find('.first');
                    previousButton = buttonBar.find('.previous');
                    nextButton = buttonBar.find('.next');
                    lastButton = buttonBar.find('.last');
                    pageTextPicker = buttonBar.find(".pagetextpicker");

                    previousButton.click(function (event) {
                        event.preventDefault();
                        if (currentPage > 0) {
                            currentPage--;
                            refreshData();
                        }
                    });
                    nextButton.click(function (event) {
                        event.preventDefault();
                        if (currentPage < (totalPages - 1)) {
                            currentPage++;
                            refreshData();
                        }
                    });

                    if (numberOfRows === null) {
                        firstButton.remove();
                        lastButton.remove();
                    } else {
                        firstButton.click(function (event) {
                            event.preventDefault();
                            if (currentPage > 0) {
                                currentPage = 0;
                                refreshData();
                            }
                        });

                        lastButton.click(function (event) {
                            event.preventDefault();
                            if (currentPage < (totalPages - 1)) {
                                currentPage = totalPages - 1;
                                refreshData();
                            }
                        });
                    }

                    buttonBar.find('.pagenumber').click(function (ev) {
                        var source = $(ev.target);
                        ev.preventDefault();
                        currentPage = 1 * source.data("pagenumber");
                        refreshData();
                    });

                    pageTextPicker.keydown(function (ev) {
                        var code = (ev.keyCode ? ev.keyCode : ev.which);
                        if (code == 13) {
                            var value = pageTextPicker.val();
                            if ($.isNumeric(value)) {
                                currentPage = 1 * value - 1;
                                if (currentPage < 0) {
                                    currentPage = 0;
                                }
                                if (currentPage > (totalPages - 1)) {
                                    currentPage = totalPages - 1;
                                }
                                refreshData();
                            }
                        }
                    });
                /*} else {
                    buttonBar = $("<div>");
                }*/

                if (previousButtonBar !== undefined) {
                    previousButtonBar.replaceWith(buttonBar);
                } else {
                    $this.append(buttonBar);
                }

                if (hadFocus) {
                    pageTextPicker.focus();
                }
            }

            function sizeLoadingOverlay() {
                if (loadingOverlay != null) {
                    loadingOverlay.width($this.width());
                    loadingOverlay.height($this.height());
                }
            }

            function showLoading() {
                if (settings.showLoadingOverlay) {
                    loadingOverlay = $(settings.templates.loadingOverlayTemplate());
                    sizeLoadingOverlay();
                    $this.prepend(loadingOverlay);
                }
            }

            function hideLoading() {
                if (loadingOverlay !== null) {
                    loadingOverlay.remove();
                    loadingOverlay = null;
                }
            }

            function getPageDataFromSource(sourceData) {
                if ($.isArray(sourceData)) {
                    pageData = sourceData;
                }
                else if ($.isPlainObject(sourceData)) {
                    pageData = sourceData.currentPage;
                    numberOfRows = sourceData.totalRows;
                }
            }

            function refreshData(newDataUrl) {
                var sortedData;
                var aVal;
                var bVal;
                var dataToSort;

                if (newDataUrl !== undefined) {
                    settings.dataUrl = newDataUrl;
                    currentPage = 0;
                }

                if (settings.data !== null) {
                    dataToSort = null;
                    if ($.isArray(settings.data)) {
                        dataToSort = settings.data;
                    }
                    else if ($.isPlainObject(settings.data)) {
                        dataToSort = settings.data.currentPage;
                        numberOfRows = settings.data.totalRows;
                    }
                    sortedData = sortedColumn === null ? dataToSort : dataToSort.sort(function (a, b) {
                        aVal = sortOrder === "asc" ? a[sortedColumn] : b[sortedColumn];
                        bVal = sortOrder === "asc" ? b[sortedColumn] : a[sortedColumn];
                        if ($.isNumeric(aVal)) {
                            if (aVal < bVal) {
                                return 1;
                            }
                            else if (aVal > bVal) {
                                return -1;
                            }
                            return 0;
                        }
                        return aVal.localeCompare(bVal);
                    });
                    pageData = dataPage(sortedData, currentPage, settings.pageSize);
                    gridElement.currentData = pageData;
                    loadData();
                    buildButtonBar();

                    if (settings.pageRenderedEvent !== null) settings.pageRenderedEvent(pageData);
                }
                else if (settings.dataUrl !== null) {
                    if (pageData === undefined) {
                        pageData = [];
                        loadData();
                    }
                    showLoading();

                    if (settings.postDataFunction !== null) {
                        var postData = $.extend({
                            page: currentPage,
                            pageSize: settings.pageSize,
                            sortColumn: sortedColumn,
                            sortOrder: sortOrder
                        }, settings.postDataFunction());

                        $.ajax({
                            url: settings.dataUrl,
                            cache: false,
                            type: 'POST',
                            dataType: 'json',
                            data: postData,
                            success: function (jsonData) {
                                getPageDataFromSource(jsonData);
                                gridElement.currentData = pageData;
                                loadData();
                                buildButtonBar();
                                hideLoading();
                                if (settings.pageRenderedEvent !== null) settings.pageRenderedEvent(pageData);
                            },
                            error: function (jqXhr, textStatus, errorThrown) {
                                if (settings.ajaxError !== null) {
                                    settings.ajaxError(jqXhr, textStatus, errorThrown);
                                }
                            }
                        });
                    } else {
                        $.ajax({
                            url: settings.dataUrl,
                            cache: false,
                            dataType: 'json',
                            data: {
                                page: currentPage,
                                pageSize: settings.pageSize,
                                sortColumn: sortedColumn,
                                sortOrder: sortOrder
                            },
                            success: function (jsonData) {
                                getPageDataFromSource(jsonData);
                                gridElement.currentData = pageData;
                                loadData();
                                buildButtonBar();
                                hideLoading();
                                if (settings.pageRenderedEvent !== null) settings.pageRenderedEvent(pageData);
                            },
                            error: function (jqXhr, textStatus, errorThrown) {
                                if (settings.ajaxError !== null) {
                                    settings.ajaxError(jqXhr, textStatus, errorThrown);
                                }
                            }
                        });
                    }
                }
                else if (settings.dataFunction !== null) {
                    getPageDataFromSource(settings.dataFunction(currentPage, settings.pageSize, sortedColumn, sortOrder));
                    gridElement.currentData = pageData;
                    loadData();
                    buildButtonBar();
                    if (settings.pageRenderedEvent !== null) settings.pageRenderedEvent(pageData);
                }
            }

            function loadData() {
                var rowTemplateIndex = 0;
                tbody.empty();
                $.each(pageData, function (rowIndex, rowData) {
                    var tr = $(settings.rowTemplates[rowTemplateIndex](rowTemplateIndex));
                    rowTemplateIndex++;
                    if (rowTemplateIndex >= settings.rowTemplates.length) {
                        rowTemplateIndex = 0;
                    }
                    $.each(settings.columnKeys, function (index, propertyName) {
                        var td;
                        if (settings.cellContainerTemplates !== null && index < settings.cellContainerTemplates.length && settings.cellContainerTemplates !== null) {
                            td = $(settings.cellContainerTemplates[index](index));
                        } else {
                            td = $('<td>');
                        }

                        if (settings.cellTemplates !== null && index < settings.cellTemplates.length && settings.cellTemplates[index] !== null) {
                            td.html(settings.cellTemplates[index](rowData));
                        }
                        else {
                            var value = rowData[propertyName];
                            td.html(value);
                        }
                        tr.append(td);
                    });
                    tbody.append(tr);
                });

                if (pageData.length < settings.minimumVisibleRows) {
                    var emptyRowIndex;
                    var emptyRow;
                    for (emptyRowIndex = pageData.length; emptyRowIndex < settings.minimumVisibleRows; emptyRowIndex++) {
                        emptyRow = $(settings.rowTemplates[rowTemplateIndex](rowTemplateIndex));
                        rowTemplateIndex++;
                        if (rowTemplateIndex >= settings.rowTemplates.length) {
                            rowTemplateIndex = 0;
                        }
                        $.each(settings.columnKeys, function () {
                            emptyRow.append(settings.templates.emptyCellTemplate());
                        });
                        tbody.append(emptyRow);
                    }
                }
            }

            table = $(settings.templates.tableTemplate());
            thead = table.find("thead");
            tbody = table.find("tbody");

            if (settings.columnDefinitionTemplates !== null) {
                $.each(settings.columnDefinitionTemplates, function (index, template) {
                    $(template(index)).insertBefore(thead);
                });
            }

            if (settings.showHeader) {
                headerRow = $("<tr>").appendTo(thead);
                $.each(settings.columnNames, function (index, columnName) {
                    var sortEnabled = settings.sortable[index];
                    var sortAscending;
                    var sortDescending;
                    var sortContainer;
                    var columnKey = settings.columnKeys[index];
                    var width;
                    var headerCell = null;

                    width = settings.columnWidths.length > index ? settings.columnWidths[index] : "";
                    if (settings.headerTemplates !== null && index < settings.headerTemplates.length && settings.headerTemplates[index] != null) {
                        headerCell = $(settings.headerTemplates[index]({ width: width, title: columnName }));
                    }

                    if (sortEnabled) {
                        if (headerCell === null) {
                            headerCell = $(settings.templates.sortableHeaderTemplate({ width: width, title: columnName }));
                        }
                        sortContainer = headerCell.find(".sort-container");
                        sortAscending = headerCell.find(".sort-ascending");
                        sortDescending = headerCell.find(".sort-descending");

                        function sort(event) {
                            event.preventDefault();
                            if (sortedColumn === columnKey) {
                                sortOrder = sortOrder === "asc" ? "desc" : "asc";
                            }
                            sortedColumn = columnKey;
                            if (sortElement != null) {
                                sortElement.removeClass("sort-ascending-active");
                                sortElement.removeClass("sort-descending-active");
                            }
                            sortElement = sortOrder === "asc" ? sortAscending : sortDescending;
                            sortElement.addClass(sortOrder === "asc" ? "sort-ascending-active" : "sort-descending-active");
                            refreshData();
                        };


                        if (sortContainer !== null) {
                            sortContainer.click(function (event) {
                                sort(event);
                            });
                        } else {
                            sortAscending.click(function (event) {
                                sort(event);
                            });

                            sortDescending.click(function (event) {
                                sort(event);
                            });
                        }
                    }
                    else {
                        if (headerCell === null) {
                            headerCell = $(settings.templates.headerTemplate({ width: width, title: columnName }));
                        }
                    }
                    headerRow.append(headerCell);
                });
            } else {
                thead.remove();
            }

            table.addClass(settings.tableClass);

            buildButtonBar();
            refreshData();

            table.insertBefore(buttonBar);
            $(window).resize(sizeLoadingOverlay);
            gridElement.refreshData = refreshData;
            return this;
        });
    };
})(jQuery);