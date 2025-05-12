'use client'
import { Container } from 'react-bootstrap';
import ProfileIntro from './ProfileIntro';
import Header from './Header';
import Body from './Body';

//Images
import bgImg from '@/assets/img/profile-bg.jpg';
import Image from 'next/image';

const Profile = () => {

    return (
        <div className="hk-pg-body">
            <Container>
                <div className="profile-wrap">
                    <div className="profile-img-wrap">
                        <Image className="img-fluid rounded-5" src={bgImg} alt="Img Description" />
                    </div>
                    <ProfileIntro />
                    <Header />
                    <Body />
                </div>
            </Container>
        </div>

    )
}


export default Profile;