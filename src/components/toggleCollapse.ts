// 判断是否存在子标题
export function hasChildHeading(headingIndex: number, allHeadings: any) {
    return headingIndex + 1 < allHeadings.length 
            ?  allHeadings[headingIndex + 1].level > allHeadings[headingIndex].level
            : false;
}

// 修改 toggleCollapse 函数支持不同的调用方式
export function toggleCollapse(eOrLi: MouseEvent | HTMLElement, liOrDoExpandAll?: HTMLElement | boolean, doExpandAll?: boolean) {
    // 处理不同的参数情况
    let li: HTMLElement;
    let shouldExpand: boolean;
    
    if (eOrLi instanceof MouseEvent) {
        // 原有的事件处理方式
        eOrLi.stopPropagation();
        li = liOrDoExpandAll as HTMLElement;
        shouldExpand = doExpandAll || false;
    } else {
        // 新增的直接传入元素的方式
        li = eOrLi;
        shouldExpand = liOrDoExpandAll as boolean;
    }

    const isCollapsed = li.getAttribute("isCollapsed");
    
    if (isCollapsed !== null) {
        if (isCollapsed === "true") {
            expandHeading(li, shouldExpand);
        } else if (isCollapsed === "false") {
            collapseHeading(li);
        }
    }
}

// 展开当前标题的子标题
export function expandHeading(liElement: HTMLElement, doExpandAll: boolean) {
    liElement.setAttribute("isCollapsed", "false");
    const rootLevel = parseInt(liElement.getAttribute("data-level"));
    let curr = liElement.nextElementSibling as HTMLElement;

    if (doExpandAll) {  // 展开所有子标题
        while (curr && parseInt(curr.getAttribute("data-level")) > rootLevel) {
            curr.style.display = 'block';
            if (curr.getAttribute("isCollapsed") !== null) {
                curr.setAttribute("isCollapsed", "false");
            }
            curr = curr.nextElementSibling as HTMLElement;
        }
    } else {  // 展开直接子标题, 举例：对于标题级别序列 2 6 5 3 4 5 2 点击第一个标题，应该展开的是 6 5 3
        let insideContainer = false;
        let minContainerLevel = Number.MAX_VALUE;  // 所有子容器标题中最低的级别
        while (curr && parseInt(curr.getAttribute("data-level")) > rootLevel) {
            const isCurrContainer = curr.getAttribute("isCollapsed") !== null;
            const currLevel = parseInt(curr.getAttribute("data-level"));

            if (!insideContainer) {
                if (isCurrContainer) {  
                    insideContainer = true;
                    minContainerLevel = currLevel;
                }
                curr.style.display = "block";
            } else {
                if (currLevel <= minContainerLevel) {
                    curr.style.display = "block";
                    insideContainer = isCurrContainer;
                    minContainerLevel = isCurrContainer ? currLevel : Number.MAX_VALUE;
                }
            }
            curr = curr.nextElementSibling as HTMLElement;
        }
    }
}

// 折叠所有子标题
export function collapseHeading(liElement: HTMLElement) {
    liElement.setAttribute("isCollapsed", "true");
  
    const rootLevel = parseInt(liElement.getAttribute("data-level"));
    let curr = liElement.nextElementSibling as HTMLElement;
    while (curr && parseInt(curr.getAttribute("data-level")) > rootLevel) {
        curr.style.display = 'none';
        if (curr.getAttribute("isCollapsed") !== null) {
            curr.setAttribute("isCollapsed", "true");
        }
        curr = curr.nextElementSibling as HTMLElement;
    }
}

// 新增用于全局折叠/展开的辅助函数
export function toggleAllHeadings(container: HTMLElement, shouldExpand: boolean) {
    const headingItems = container.querySelectorAll("li.heading-list-item[iscollapsed]");
    
    headingItems.forEach((item) => {
        const li = item as HTMLElement;
        const isCollapsed = li.getAttribute("isCollapsed") === "true";
        
        // 只在状态不一致时进行切换
        if (shouldExpand !== !isCollapsed) {
            toggleCollapse(li, shouldExpand);
        }
    });
}