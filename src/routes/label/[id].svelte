<script>
	import Icon from 'svelte-awesome';
    import { faYoutube } from '@fortawesome/free-brands-svg-icons/faYoutube';
    import { faTwitter } from '@fortawesome/free-brands-svg-icons/faTwitter';
    import { faInstagram } from '@fortawesome/free-brands-svg-icons/faInstagram';
    import { faFacebook } from '@fortawesome/free-brands-svg-icons/faFacebook';
    import { faGlobe } from '@fortawesome/free-solid-svg-icons/faGlobe';
    import { slide } from "svelte/transition";
	import { page } from '$app/stores';
    import { browser } from "$app/env";
    import { goto } from "$app/navigation";
    import { doc, getDoc } from "firebase/firestore";
    import { onMount } from "svelte";
    import { auth, db } from "../../firebase.js";

    let userLoaded = false;
    let labelData = {};
    let changeMode = false;
    let biographyCollapsed = false;

    onMount(() => {
        loginToFirebase();
    })

    function getCurrentUser() {
        return new Promise((resolve, reject) => {
            if (userLoaded) {
                resolve(auth.currentUser);
            }
            const unsubscribe = auth.onAuthStateChanged(user => {
                userLoaded = true;
                unsubscribe();
                resolve(user);
            }, reject);
        });
    }

    async function loginToFirebase() {
        const user = await getCurrentUser();
        if (user !== null) {
            const labelDataDocument = await getDoc(doc(db, `labels/${$page.params.id}`));
            if (labelDataDocument.exists()) {
                labelData = labelDataDocument.data();
            } else {
                if (browser) {
                    goto("/error");
                }
            }
        } else {
            if (browser) {
                goto("/error");
            }
        }
    }

    function enterChangeMode() {

    }
</script>

<div class="page mx-6">
    <div class="mt-2 text-sm breadcrumbs">
        <ul>
            <li><a href="/label/all">Labels</a></li>
            <li>{labelData?.name}</li>
        </ul>
    </div>
    
    <div class="flex justify-between mt-6">
        <div class="header sticky top-6 h-full basis-1/5 flex flex-col justify-center items-center">
            <span class="max-w-[10rem]">
                <img class="rounded-full drop-shadow-xl hover:-translate-y-1 transition-all h-40 w-40 min-h-[10rem] min-w-[10rem]" src="https://pbs.twimg.com/profile_images/1395279620694372353/5y3Ga9m6_400x400.jpg" alt="">
                <h2 class="text-2xl text-center font-black mt-4">{labelData?.name}</h2>
            </span>
            <div class="history w-3/4 mt-4 text-xs transition-all hover:-translate-y-1 p-4 drop-shadow-xl rounded-lg bg-gray-800">
                <h2 class="italic inline text-gray-400">HISTORY</h2>
                <button class="float-right inline" on:click={() => {
                    biographyCollapsed = !biographyCollapsed;
                }}>Collapse</button>
                
                {#if biographyCollapsed}
                    <div transition:slide>
                        <div id="divider" class="w-full bg-gray-700 h-0.5"></div>
                        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Similique neque veritatis non rerum quos sint, suscipit temporibus cupiditate necessitatibus, accusamus obcaecati modi tempore aliquid aliquam, dignissimos sapiente corrupti at magni?</p>
                    </div>
                {/if}
            </div>
            {#if labelData?.twitterHref || labelData?.instagramHref || labelData?.facebookHref || labelData?.youtubeHref || labelData?.websiteHref}
                <div class="socials mt-6 text-xs w-3/4 flex justify-evenly drop-shadow-lg">
                    {#if labelData?.twitterHref}
                        <a class="transition-all hover:-translate-y-1" href="{labelData?.twitterHref}"><Icon data={faTwitter}/></a>
                    {/if}
                    {#if labelData?.instagramHref}
                        <a class="transition-all hover:-translate-y-1" href="{labelData?.instagramHref}"><Icon data={faInstagram}/></a>
                    {/if}
                    {#if labelData?.facebookHref}
                        <a class="transition-all hover:-translate-y-1" href="{labelData?.facebookHref}"><Icon data={faFacebook}/></a>
                    {/if}
                    {#if labelData?.youtubeHref}
                        <a class="transition-all hover:-translate-y-1" href="{labelData?.youtubeHref}"><Icon data={faYoutube}/></a>
                    {/if}
                    {#if labelData?.websiteHref}
                        <a class="transition-all hover:-translate-y-1" href="{labelData?.websiteHref}"><Icon data={faGlobe}/></a>
                    {/if}
                </div>
            {/if}
            <button class="text-xs my-6 opacity-10 transition-all hover:opacity-100 self-start" on:cilck={enterChangeMode}>Change</button>
        </div>
        <div class="content basis-4/5 pr-14">
            <h2 class="text-4xl font-black">Music released by {labelData?.name}</h2>
            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Rem dolores natus eveniet sequi, at laboriosam quaerat aperiam quidem magni in velit illo maiores provident praesentium, delectus inventore excepturi expedita! Numquam?
            Labore molestias sint est doloribus quia optio sit laboriosam, voluptatem quis ratione! Dolor ratione aliquid ut ad deleniti magni tempore dignissimos quisquam ipsam, architecto, fugit soluta. Id inventore enim corporis!
            Ad sapiente dicta officia excepturi totam fuga suscipit sint incidunt atque, harum temporibus laborum quibusdam maxime non beatae tenetur perferendis doloremque illo. Perferendis voluptatem veniam sunt et incidunt, minima quam.
            Adipisci incidunt consequatur commodi! Voluptas, quis veritatis eaque non fugit optio rerum provident quam soluta dolore ratione id eum in harum error, consectetur sint iusto nostrum pariatur nihil dolores rem.
            Quae molestiae repellendus sapiente adipisci commodi vero vel, ratione quisquam at impedit enim fugit quam facilis unde, autem quo, tempore delectus incidunt temporibus esse. Odio repellat facere deserunt debitis officia!
            Sed architecto dignissimos suscipit tenetur rem, laborum libero quos iure facere soluta quod optio pariatur sit in nam, natus culpa neque. Nobis nemo sunt quaerat itaque reprehenderit, ipsam magnam dolor?
            Expedita repellendus quasi corrupti qui ducimus nostrum excepturi, rem voluptatibus? Voluptates nesciunt ratione minima mollitia ipsum quia hic ut. Vero tempora tempore sapiente sequi quam quas vel quis et cupiditate!
            Consequatur laudantium quidem debitis inventore, velit voluptatum! Voluptatum quasi accusamus eos iusto quae possimus sed, quod ad vel corporis vero consequuntur, porro impedit tempore minus facere cupiditate repellat nemo quibusdam!
            Vel dignissimos harum consequatur officiis voluptatum ipsum rerum eaque, iusto officia sunt nesciunt, eligendi enim cum, fuga necessitatibus quo beatae neque quisquam asperiores est! Quo repellat quasi magni praesentium iusto?
            Aspernatur placeat beatae eligendi obcaecati, nisi odit aliquam error aut quisquam reprehenderit cumque atque, illo culpa commodi repellendus totam perspiciatis fuga fugit voluptatibus nesciunt, sapiente sequi! Suscipit ducimus veritatis quidem!
            Aut soluta consectetur, deserunt sed repellat maxime? Corporis aut reprehenderit delectus maiores odit deserunt iure non, natus officia quis sed nam eos voluptatem fuga unde magni expedita accusamus recusandae excepturi.
            Delectus sapiente harum deleniti totam reiciendis possimus inventore maxime praesentium quo, aliquid culpa voluptatibus mollitia quaerat aspernatur blanditiis qui assumenda vitae molestiae ut libero obcaecati alias esse. Nesciunt, quod non!
            Deleniti, error? Sequi eum perferendis veritatis suscipit earum corporis molestiae cupiditate possimus nesciunt voluptas qui, quibusdam, doloribus assumenda ex. In rerum ad eveniet cupiditate incidunt nemo sint ullam libero nostrum.
            Quam praesentium incidunt, autem pariatur necessitatibus sequi officia ut impedit repellat a veniam nostrum, eum odio dignissimos fugit eos voluptatem? Quod molestias aperiam cumque perspiciatis recusandae labore! Ad, quasi adipisci.
            Obcaecati cumque nostrum placeat provident nulla minima qui enim distinctio cum aut accusantium facilis dolorum, quaerat a eveniet libero repellendus modi dicta quae. Itaque esse recusandae minus, aspernatur earum architecto.
            At rem maiores impedit soluta expedita maxime iusto inventore est, accusantium aperiam, molestias quidem vel? Quaerat vero, atque ipsum dicta sit natus repellendus dignissimos odio architecto, molestiae assumenda corrupti voluptatibus?
            Dolorum asperiores, vitae excepturi, eaque pariatur accusamus amet rerum iusto et explicabo perferendis maiores unde, magnam vero minima itaque hic. Animi quam hic iusto, adipisci harum unde corporis quasi labore.
            Veniam officiis nihil voluptas. Praesentium commodi suscipit, laudantium optio esse assumenda similique veritatis in, minus ducimus velit quis harum aliquam dolores doloremque facere dolore fugit tenetur autem dolorum, molestias voluptatem.
            Odit obcaecati neque ipsum praesentium, adipisci dignissimos voluptatem voluptates eum. Facere, minima! Officia, modi fuga. Totam ipsam odio corporis, quod accusamus nulla explicabo? Rerum voluptatum adipisci vero dicta aut quam.
            Velit repellendus illo vitae dolore, temporibus molestias voluptate possimus ut adipisci id commodi maiores minima consectetur, quod numquam dignissimos omnis atque suscipit repudiandae tempora modi in harum. Tempora, error voluptas.
            Aut repudiandae, tempore est assumenda odit incidunt unde, veritatis temporibus porro, autem magnam. Et ab eius sint quae perferendis, modi nulla neque. Asperiores optio dolores molestias ratione sapiente facilis voluptatibus?
            Nemo eligendi nobis, provident obcaecati nostrum odio iure debitis facere assumenda nesciunt vero quod nisi, molestiae accusantium voluptatum accusamus, fuga quibusdam in ullam possimus delectus! Voluptas modi id doloremque explicabo?
            Dolor ipsam facere asperiores in! Sit autem esse consectetur beatae, dolore rem voluptatibus commodi, impedit nihil quis quam nisi suscipit aspernatur nobis repudiandae facere doloribus vero ad optio recusandae asperiores?
            Recusandae consectetur nostrum sunt ab sequi deleniti qui asperiores optio tempora nesciunt. Excepturi illum delectus facilis nobis ducimus deleniti et, consectetur explicabo architecto corporis ea consequuntur aperiam tempore id soluta!
            Dolorum cupiditate id obcaecati, soluta eveniet ipsam inventore optio nobis dolorem repellat debitis fugiat rem laboriosam minima distinctio nostrum vel! Quidem nulla voluptate, temporibus consequatur vel aut dolor facilis placeat.
            Harum dolores praesentium, beatae autem totam nobis deleniti ipsum accusantium sit molestias reiciendis, nemo dolorem impedit provident modi quae. Itaque minus aperiam ipsam dolorem libero soluta recusandae, deleniti rem quis?
            Accusamus totam quia enim a voluptas velit asperiores libero, voluptatibus itaque odit animi incidunt necessitatibus facilis consequuntur explicabo pariatur vero alias atque similique! Repellendus at pariatur quod rerum sit provident.
            At esse repellendus dolore tempora quaerat praesentium iure assumenda delectus, aut, necessitatibus fuga rerum laudantium. Exercitationem perspiciatis qui nihil mollitia enim, cumque atque architecto voluptates saepe recusandae quidem! Est, debitis?
            Fugit dolores recusandae facere itaque praesentium doloribus perspiciatis. Ratione omnis tempora a ad dolorum placeat eius vitae labore unde. Ducimus consequuntur nobis minima ab rerum eligendi ea labore maiores neque?
            Non sit sequi laudantium incidunt impedit? Accusamus repudiandae voluptatem cumque dolorem laborum nihil maiores porro error ipsam illo culpa minus, tempore quo aliquid necessitatibus facere at esse nostrum enim voluptates.
            In ex eum magni nemo laudantium omnis a iure reiciendis vel dolorum quam atque corporis adipisci excepturi animi voluptatibus ut doloremque, sunt obcaecati earum ad cupiditate error ab. Ipsum, ipsa.
            Reiciendis alias illo a nulla quos sapiente assumenda necessitatibus, tenetur deleniti porro harum fuga voluptatibus voluptates quae maiores nesciunt iusto labore! Reprehenderit distinctio doloremque temporibus ipsam beatae magnam aperiam earum?
            Earum optio ut, vitae ipsa vel amet dolores nostrum eum ratione. Ratione saepe autem ipsam aliquam, blanditiis quas, reiciendis illo ad accusantium hic facere aliquid veniam esse voluptatum modi molestiae!
            Perspiciatis cupiditate corporis libero! Dignissimos, impedit! Dolorum veniam explicabo, nam velit voluptatibus omnis nostrum, doloribus dignissimos laudantium amet obcaecati animi sunt consequuntur doloremque adipisci qui. Culpa temporibus aut vel adipisci!
            Assumenda suscipit tempora repellat fuga a culpa dicta eligendi neque dolorem ea, cupiditate qui cumque adipisci iste quidem deserunt minus id optio nihil doloremque quaerat ex veritatis beatae. Fuga, ex?
            Tempora ab dolores amet reprehenderit praesentium. Totam, voluptatem? Veniam tempore, voluptatem temporibus fugiat at ducimus modi minima, rem corrupti iure quas, libero deleniti vel odit non! Minima possimus explicabo tempora.
            Nihil doloribus laboriosam delectus at laborum ullam praesentium, dicta qui corporis, totam facilis unde distinctio quibusdam deserunt quaerat beatae incidunt. Reprehenderit adipisci a obcaecati deserunt dolore illum autem labore perferendis?
            Provident, est dolor. Pariatur accusantium dignissimos beatae maiores eveniet tempora, similique deserunt, incidunt reprehenderit ea recusandae voluptatum ullam expedita ducimus iusto distinctio doloremque velit id consequuntur. Ullam accusamus optio pariatur?
            Exercitationem, maxime. Fugiat explicabo hic quia earum distinctio provident accusantium magnam inventore repellendus esse atque enim in laboriosam neque animi vitae molestiae ullam, nihil quae quis. Esse voluptatum non nisi.
            Ducimus itaque dolore earum similique, ratione rerum reprehenderit ipsam suscipit, delectus provident temporibus, eligendi atque asperiores at explicabo unde ad obcaecati dicta voluptate alias aspernatur aperiam odit? Eligendi, reiciendis omnis.</p>
        </div>
    </div>
</div>

<style>

</style>