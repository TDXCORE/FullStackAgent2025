import { ArrowBarToLeft } from 'tabler-icons-react';
import { Button } from 'react-bootstrap';
import Link from 'next/link';
import Image from 'next/image';
import { useGlobalStateContext } from '@/context/GolobalStateProvider';
//Images
import logo from '@/assets/img/brand-sm.svg';
import jampackImg from '@/assets/img/Jampack.svg';


const SidebarHeader = () => {
    const { states, dispatch } = useGlobalStateContext();

    const toggleSidebar = () => {
        dispatch({ type: 'sidebar_toggle' });
    }

    return (
        <div className="menu-header">
            <span>
                <Link className="navbar-brand" href="/">
                    <Image className="brand-img img-fluid" src={logo} alt="brand" />
                    <Image className="brand-img img-fluid" src={jampackImg} alt="brand" />
                </Link>
                <Button variant="flush-dark" onClick={toggleSidebar} className="btn-icon btn-rounded flush-soft-hover navbar-toggle">
                    <span className="icon">
                        <span className="svg-icon fs-5">
                            <ArrowBarToLeft />
                        </span>
                    </span>
                </Button>
            </span>
        </div>
    )
}


export default SidebarHeader
