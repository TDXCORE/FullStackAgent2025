'use client'
import SimpleHeader from '../../SimpleHeader';
import Body from './Body';
import PageFooter from '@/layout/Footer/PageFooter';

const SignUpSimple = () => {
    return (
        <div>
            <SimpleHeader />
            <div className="hk-pg-wrapper">
                <Body />
                <PageFooter />
            </div>
        </div>

    )
}

export default SignUpSimple
