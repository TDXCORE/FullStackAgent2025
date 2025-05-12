/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from 'react';
import { Button, Card, Nav, NavLink } from 'react-bootstrap';
import SimpleBar from 'simplebar-react';
import SidebarHeader from './SidebarHeader';
import { SidebarMenu } from './SidebarMenu';
import classNames from 'classnames';
import Link from 'next/link';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
    const { dispatch } = useGlobalStateContext();
    const [activeMenu, setActiveMenu] = useState();
    const [activeSubMenu, setActiveSubMenu] = useState();
    const pathname = usePathname();

    useEffect(() => {
        require("bootstrap/js/dist/collapse");
    }, []);

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
    }


    return (
        <>
            <div className="hk-menu">
                {/* Brand */}
                <SidebarHeader />
                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        {SidebarMenu.map((routes, index) => (
                            <React.Fragment key={index}>
                                <div className="menu-group" >
                                    {routes.group && <div className="nav-header" >
                                        <span>{routes.group}</span>
                                    </div>}
                                    {routes.contents.map((menus, idx) => (
                                        <Nav bsPrefix="navbar-nav" className="flex-column" key={idx}>
                                            <Nav.Item className={classNames({ "active": pathname.startsWith(menus.path) })}>
                                                {
                                                    menus.childrens
                                                        ?
                                                        <>
                                                            <Nav.Link data-bs-toggle="collapse" data-bs-target={`#${menus.id}`} aria-expanded={activeMenu === menus.name ? "true" : "false"} onClick={() => setActiveMenu(menus.name)} >
                                                                <span className={classNames("nav-icon-wrap", { "position-relative": menus.iconBadge })}>
                                                                    {menus.iconBadge && menus.iconBadge}
                                                                    <span className="svg-icon">
                                                                        {menus.icon}
                                                                    </span>
                                                                </span>
                                                                <span className={classNames("nav-link-text", { "position-relative": menus.badgeIndicator })} >
                                                                    {menus.name}
                                                                    {menus.badgeIndicator && menus.badgeIndicator}
                                                                </span>
                                                                {menus.badge && menus.badge}
                                                            </Nav.Link>

                                                            {/* <Collapse in={open}> */}
                                                            <ul id={menus.id} className={classNames("nav flex-column nav-children", { "collapse": activeMenu !== menus.name })}>
                                                                <li className="nav-item">
                                                                    <ul className="nav flex-column">
                                                                        {menus.childrens.map((subMenu, indx) => (
                                                                            subMenu.childrens
                                                                                ?
                                                                                <li className="nav-item" key={indx} >
                                                                                    <Nav.Link as={Link} href={subMenu.path} className="nav-link" data-bs-toggle="collapse" data-bs-target={`#${subMenu.id}`} aria-expanded={activeSubMenu === subMenu.name ? "true" : "false"} onClick={() => setActiveSubMenu(subMenu.name)}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Nav.Link>

                                                                                    {subMenu.childrens.map((childrenPath, i) => (
                                                                                        <ul id={subMenu.id} className={classNames("nav flex-column nav-children", { "collapse": activeSubMenu !== subMenu.name })} key={i}>
                                                                                            <li className="nav-item">
                                                                                                <ul className="nav flex-column">
                                                                                                    <li className="nav-item">
                                                                                                        <Link href={childrenPath.path} onClick={handleClick} className={classNames("nav-link", { "active": pathname === childrenPath.path })}>
                                                                                                            <span className="nav-link-text">
                                                                                                                {childrenPath.name}
                                                                                                            </span>
                                                                                                        </Link>
                                                                                                    </li>
                                                                                                </ul>
                                                                                            </li>
                                                                                        </ul>
                                                                                    ))}

                                                                                </li>
                                                                                :
                                                                                <li className="nav-item" key={indx}>
                                                                                    <Link href={subMenu.path} onClick={handleClick} className={classNames("nav-link", { "active": pathname === subMenu.path })}>
                                                                                        <span className="nav-link-text">
                                                                                            {subMenu.name}
                                                                                        </span>
                                                                                    </Link>
                                                                                </li>
                                                                        ))}
                                                                    </ul>
                                                                </li>
                                                            </ul>
                                                            {/* </Collapse> */}

                                                        </>
                                                        :
                                                        <>
                                                            {
                                                                (routes.group === "Documentation")
                                                                    ?
                                                                    <a className="nav-link" href={menus.path} target="_blank" rel="noreferrer" >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </a>
                                                                    :
                                                                    <Link href={menus.path} onClick={() => handleClick(menus.name)} className={classNames("nav-link", { "active": pathname === menus.path })} >
                                                                        <span className="nav-icon-wrap">
                                                                            <span className="svg-icon">
                                                                                {menus.icon}
                                                                            </span>
                                                                        </span>
                                                                        <span className="nav-link-text">{menus.name}</span>
                                                                        {menus.badge && menus.badge}
                                                                    </Link>
                                                            }
                                                        </>
                                                }
                                            </Nav.Item>
                                        </Nav>
                                    ))}
                                </div>
                                <div className="menu-gap" />
                            </React.Fragment>
                        ))}

                        <Card bg="orange-light-5" className="callout card-flush  text-center w-220p mx-auto">
                            <Card.Body>
                                <h5 className="h5">Quickly Build Applications</h5>
                                <Card.Text className="p-sm">Exclusively for webapps Based on Bootstrap</Card.Text>
                                <Button variant="primary" href="https://next-nubra-ui.vercel.app/" target="_blank" rel="noreferrer" className="btn-block">Go Nubra-UI</Button>
                            </Card.Body>
                        </Card>
                    </div>
                </SimpleBar>
                {/* /Main Menu */}
            </div >
            <div onClick={() => dispatch({ type: 'sidebar_toggle' })} className="hk-menu-backdrop" />
        </>
    )
}



export default Sidebar;